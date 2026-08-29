-- ---------------------------------------------------------------------------
-- Deriving coverage from how far somebody will travel.
--
-- Runs once, when an auditor saves. Never at match time — matching stays a
-- join on place_id, which is the property the old postcode-area design was
-- chosen for and the reason this change does not cost anything in the request
-- path.
-- ---------------------------------------------------------------------------

/**
 * Roughly how far you get in a minute, in kilometres, as the crow flies.
 *
 * Well below road speeds, for two compounding reasons: roads are around 1.3
 * times longer than the straight line between two points, and a door-to-door
 * journey includes parking, walking and waiting that no speed limit accounts
 * for. Driving at 0.5 puts Manchester to Bolton at about half an hour, which
 * is what it actually takes.
 *
 * Public transport is slower again once connections are counted. `either`
 * takes the driving figure, because somebody with a car will use it for the
 * far ones.
 *
 * This is an estimate and the screen says so. It exists to PROPOSE a list of
 * places, which the auditor then corrects — the correction is what gets
 * stored. Replacing it with real journey times changes this function and
 * nothing else, because `max_travel_minutes` was recorded as given.
 */
create or replace function public.travel_km_per_minute(p_mode public.travel_mode)
returns double precision
language sql
immutable
as $$
  select case p_mode
    when 'public_transport' then 0.30
    when 'own_vehicle'      then 0.50
    else 0.50
  end;
$$;

/**
 * Great-circle distance in kilometres.
 *
 * Haversine, written out rather than pulled from PostGIS: this is one formula
 * used in one place, and an extension is a heavier dependency than eleven
 * lines of arithmetic.
 */
create or replace function public.distance_km(
  p_lat_a double precision, p_lng_a double precision,
  p_lat_b double precision, p_lng_b double precision
)
returns double precision
language sql
immutable
as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(p_lat_b - p_lat_a) / 2), 2) +
    cos(radians(p_lat_a)) * cos(radians(p_lat_b)) *
    power(sin(radians(p_lng_b - p_lng_a) / 2), 2)
  ));
$$;

/**
 * The places within reach of somewhere, with a rough minutes figure for each.
 *
 * What the coverage screen shows an auditor before they tick anything.
 */
create or replace function public.places_within_reach(
  p_place_id uuid,
  p_minutes  integer,
  p_mode     public.travel_mode
)
returns table (place_id uuid, name text, region text, minutes integer)
language sql
stable
as $$
  select
    p.id,
    p.name,
    p.region,
    greatest(1, round(
      public.distance_km(origin.latitude, origin.longitude, p.latitude, p.longitude)
      / public.travel_km_per_minute(p_mode)
    )::integer)
  from public.place p
  cross join (select latitude, longitude, country_code from public.place where id = p_place_id) origin
  where p.country_code = origin.country_code
    and public.distance_km(origin.latitude, origin.longitude, p.latitude, p.longitude)
        <= p_minutes * public.travel_km_per_minute(p_mode)
  order by 4, 2;
$$;

revoke all on function public.places_within_reach(uuid, integer, public.travel_mode) from public, anon;
grant execute on function public.places_within_reach(uuid, integer, public.travel_mode) to authenticated;

/**
 * Save where an auditor will work.
 *
 * Takes the places they CONFIRMED, not the circle that proposed them — the
 * derivation is a suggestion and the auditor's correction is the fact. A place
 * they unticked is recorded as `excluded` rather than simply absent, so
 * re-deriving after they move house does not quietly undo it.
 *
 * Replaces the once-only rule that came with `complete_auditor_profile`
 * (TND-92): travel genuinely changes — somebody buys a car, somebody moves —
 * and refusing to let them say so was the wrong constraint. What must never be
 * self-editable is `approval_status`, and this function does not touch it.
 */
create or replace function public.set_auditor_coverage(
  p_base_place_id uuid,
  p_minutes       integer,
  p_mode          public.travel_mode,
  p_place_ids     uuid[],
  p_excluded_ids  uuid[] default '{}'
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user  uuid := auth.uid();
  v_count integer;
begin
  if v_user is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.auditor_profile where user_id = v_user) then
    raise exception 'only an auditor has coverage' using errcode = 'insufficient_privilege';
  end if;

  if coalesce(array_length(p_place_ids, 1), 0) = 0 then
    raise exception 'an auditor works somewhere — pick at least one place'
      using errcode = 'check_violation';
  end if;

  update public.auditor_profile
     set base_place_id      = p_base_place_id,
         max_travel_minutes = p_minutes,
         travel_mode        = p_mode
   where user_id = v_user;

  -- Replaced wholesale: this is a statement of where they work now, and a
  -- place dropped from the list is one they no longer cover.
  delete from public.auditor_coverage where auditor_id = v_user;

  insert into public.auditor_coverage (auditor_id, place_id, source)
  select v_user, id, 'derived' from unnest(p_place_ids) as id
  on conflict do nothing;

  -- An exclusion only means something for a place they did not also keep.
  insert into public.auditor_coverage (auditor_id, place_id, source)
  select v_user, e.id, 'excluded'
  from unnest(p_excluded_ids) as e(id)
  where not exists (select 1 from unnest(p_place_ids) as k(id) where k.id = e.id)
  on conflict do nothing;

  select count(*) into v_count
  from public.auditor_coverage
  where auditor_id = v_user and source <> 'excluded';

  return v_count;
end;
$$;

revoke all on function public.set_auditor_coverage(uuid, integer, public.travel_mode, uuid[], uuid[])
  from public, anon;
grant execute on function public.set_auditor_coverage(uuid, integer, public.travel_mode, uuid[], uuid[])
  to authenticated;
