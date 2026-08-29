-- ---------------------------------------------------------------------------
-- Matching moves from postcode areas to places.
--
-- Every function that decided "can this auditor reach this audit" asked whether
-- their postcode-area list contained the audit's. They now ask whether their
-- place list contains the audit's place, minus anything they excluded.
--
-- Still one join, still no arithmetic in the request path. The only thing that
-- changed is what the two sides agree on — and now it is something that exists
-- in every country rather than only this one.
--
-- The REACHABLE reason text changes with it: "covers Salford" is a sentence an
-- ops person can act on; "covers M" was a lookup.
-- ---------------------------------------------------------------------------

create or replace function public.eligible_auditors(p_audit_id uuid)
returns table (
  auditor_id   uuid,
  match_reason text,
  warnings     public.eligibility_flag[]
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with allowed as (select app.is_admin() as ok),
  target as (
    select a.id, a.client_organisation_id, a.place_id, a.audit_type,
           a.window_start_on, a.window_end_on, a.requires_av,
           p.name as place_name
    from public.audit a
    left join public.place p on p.id = a.place_id
    where a.id = p_audit_id
  ),
  history as (
    select a.auditor_id, max(a.window_end_on) as last_seen
    from public.audit a, target t
    where a.client_organisation_id = t.client_organisation_id
      and a.auditor_id is not null and a.id <> t.id
    group by a.auditor_id
  )
  select
    ap.user_id,
    format('covers %s, approved, capable of %s%s', t.place_name, t.audit_type,
           case when t.requires_av then ', A/V equipped' else '' end),
    case when h.last_seen is not null
         then array['familiarity']::public.eligibility_flag[]
         else '{}'::public.eligibility_flag[] end
  from public.auditor_profile ap
  cross join target t
  cross join allowed
  left join history h on h.auditor_id = ap.user_id
  where
    allowed.ok
    -- An audit with no place resolved cannot be matched to anybody. Visible as
    -- an empty console rather than a silently wrong offer.
    and t.place_id is not null
    and ap.approval_status = 'approved'
    and (not t.requires_av or ap.av_capable)
    and exists (
      select 1 from public.auditor_coverage c
      where c.auditor_id = ap.user_id
        and c.place_id = t.place_id
        and c.source <> 'excluded'
    )
    and exists (
      select 1 from public.auditor_capability k
      where k.auditor_id = ap.user_id and k.audit_type = t.audit_type
    )
    and not exists (
      select 1 from public.auditor_conflict f
      where f.auditor_id = ap.user_id and f.organisation_id = t.client_organisation_id
    )
    and (h.last_seen is null or h.last_seen < current_date - public.exposure_window_days())
    and not exists (
      select 1 from public.audit busy
      where busy.auditor_id = ap.user_id and busy.id <> t.id
        and busy.status in ('assigned', 'in_progress')
        and busy.window_start_on <= t.window_end_on
        and busy.window_end_on   >= t.window_start_on
    )
    and not exists (
      select 1 from public.audit_offer o
      where o.audit_id = t.id and o.auditor_id = ap.user_id
        and o.outcome in ('offered', 'accepted')
    );
$$;

-- ---------------------------------------------------------------------------
-- The console. Its shape is unchanged — the portal reads `warnings` and
-- `offer_state` — so only the reachability test and its wording move.
-- ---------------------------------------------------------------------------
create or replace function public.assignment_console(p_audit_id uuid)
returns table (
  auditor_id   uuid,
  eligible     boolean,
  reasons      text[],
  warnings     public.eligibility_flag[],
  offer_state  text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with caller as (select app.is_admin() as ok),
  target as (
    select id, client_organisation_id, place_id, audit_type,
           window_start_on, window_end_on, requires_av
    from public.audit where id = p_audit_id
  ),
  history as (
    select a.auditor_id, max(a.window_end_on) as last_seen
    from public.audit a, target t
    where a.client_organisation_id = t.client_organisation_id
      and a.auditor_id is not null and a.id <> t.id
    group by a.auditor_id
  ),
  assessed as (
    select
      ap.user_id,
      ap.approval_status = 'approved' as approved,
      (not t.requires_av or ap.av_capable) as av_ok,
      exists (select 1 from public.auditor_coverage c
               where c.auditor_id = ap.user_id and c.place_id = t.place_id
                 and c.source <> 'excluded') as reachable,
      exists (select 1 from public.auditor_capability k
               where k.auditor_id = ap.user_id and k.audit_type = t.audit_type) as capable,
      not exists (select 1 from public.auditor_conflict f
                   where f.auditor_id = ap.user_id
                     and f.organisation_id = t.client_organisation_id) as no_conflict,
      (h.last_seen is null or h.last_seen < current_date - public.exposure_window_days()) as exposure_ok,
      not exists (select 1 from public.audit busy
                   where busy.auditor_id = ap.user_id and busy.id <> t.id
                     and busy.status in ('assigned', 'in_progress')
                     and busy.window_start_on <= t.window_end_on
                     and busy.window_end_on   >= t.window_start_on) as available,
      h.last_seen is not null as familiar,
      (select o.outcome::text from public.audit_offer o
        where o.audit_id = t.id and o.auditor_id = ap.user_id) as offer_state
    from public.auditor_profile ap
    cross join target t
    cross join caller
    left join history h on h.auditor_id = ap.user_id
    where caller.ok
  )
  select
    user_id,
    approved and av_ok and reachable and capable and no_conflict and exposure_ok and available,
    -- Only the reasons that actually applied, in the order an operator reads
    -- them: the blocking ones first.
    array_remove(array[
      case when not no_conflict  then 'Declared conflict with this charity' end,
      case when not approved     then 'Not approved' end,
      case when not reachable    then 'Does not cover this place' end,
      case when not capable      then 'Not signed off for this methodology' end,
      case when not av_ok        then 'No A/V capability, and the client asked for it' end,
      case when not exposure_ok  then 'Audited this charity too recently' end,
      case when not available    then 'Already committed in this window' end
    ], null),
    case when familiar and exposure_ok then array['familiarity']::public.eligibility_flag[]
         else '{}'::public.eligibility_flag[] end,
    offer_state
  from assessed
  order by 2 desc, 1;
$$;

-- ---------------------------------------------------------------------------
-- What a charity may choose from, by code, never by name.
--
-- Called while BOOKING, before an audit exists, so it takes the place and type
-- being booked rather than an audit id. Same shape as before; `p_postcode_area`
-- becomes `p_place_id`.
--
-- The old signature is dropped explicitly. `create or replace` with different
-- arguments leaves the previous function callable beside the new one, and a
-- caller matching the old shape would silently keep matching on postcode areas
-- that nothing maintains any more.
-- ---------------------------------------------------------------------------
drop function if exists public.selectable_auditors(uuid, text, public.audit_type, boolean);

create function public.selectable_auditors(
  p_organisation_id uuid,
  p_place_id        uuid,
  p_audit_type      public.audit_type,
  p_requires_av     boolean default false
)
returns table (
  code             text,
  state            text,
  audits_completed integer,
  av_capable       boolean,
  warning          text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with caller as (
    select app.is_admin() as is_admin, app.current_org() as org
  ),
  recent as (
    select a.auditor_id, count(*) as seen
    from public.audit a
    where a.client_organisation_id = p_organisation_id
      and a.auditor_id is not null
      and a.window_end_on > current_date - 60
    group by a.auditor_id
  )
  select
    public.auditor_code_for(ap.user_id, p_organisation_id),
    case
      when cf.auditor_id is not null then 'blocked'
      when r.seen is not null then 'familiarity'
      else 'available'
    end,
    (select count(*)::integer from public.audit d
      where d.auditor_id = ap.user_id and d.status = 'released'),
    ap.av_capable,
    case
      when cf.auditor_id is not null
        then 'Cannot be selected — a declared conflict with your organisation.'
      when r.seen is not null
        then format(
          'Familiarity warning — has audited your teams %s times in 60 days. You can proceed; PICK will follow up on rotation.',
          r.seen
        )
      else null
    end
  from public.auditor_profile ap
  cross join caller
  left join recent r on r.auditor_id = ap.user_id
  left join public.auditor_conflict cf
    on cf.auditor_id = ap.user_id and cf.organisation_id = p_organisation_id
  where
    -- A charity may only look at its own pool.
    (caller.is_admin or caller.org = p_organisation_id)
    and ap.approval_status = 'approved'
    and (not p_requires_av or ap.av_capable)
    and exists (
      select 1 from public.auditor_coverage c
      where c.auditor_id = ap.user_id and c.place_id = p_place_id and c.source <> 'excluded'
    )
    and exists (
      select 1 from public.auditor_capability k
      where k.auditor_id = ap.user_id and k.audit_type = p_audit_type
    )
  order by 3 desc;
$$;

revoke all on function public.selectable_auditors(uuid, uuid, public.audit_type, boolean)
  from public, anon;
grant execute on function public.selectable_auditors(uuid, uuid, public.audit_type, boolean)
  to authenticated;

-- ---------------------------------------------------------------------------
-- The roster now reports where somebody works in words, and what they told us
-- about travelling.
-- ---------------------------------------------------------------------------
drop function if exists public.auditor_roster();

create function public.auditor_roster()
returns table (
  auditor_id         uuid,
  full_name          text,
  email              text,
  approval_status    public.auditor_approval_status,
  user_status        public.user_status,
  approved_at        timestamptz,
  base_postcode      text,
  base_place         text,
  max_travel_minutes integer,
  travel_mode        public.travel_mode,
  av_capable         boolean,
  areas              text[],
  audit_types        public.audit_type[],
  audits_completed   integer,
  open_conflicts     integer
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    p.user_id,
    u.full_name,
    u.email,
    p.approval_status,
    u.status,
    p.approved_at,
    p.base_postcode,
    bp.name,
    p.max_travel_minutes,
    p.travel_mode,
    p.av_capable,
    coalesce((select array_agg(pl.name order by pl.name)
              from public.auditor_coverage c
              join public.place pl on pl.id = c.place_id
              where c.auditor_id = p.user_id and c.source <> 'excluded'), '{}'),
    coalesce((select array_agg(k.audit_type order by k.audit_type)
              from public.auditor_capability k where k.auditor_id = p.user_id), '{}'),
    (select count(*)::integer from public.audit a
      where a.auditor_id = p.user_id and a.status = 'released'),
    (select count(*)::integer from public.auditor_conflict f where f.auditor_id = p.user_id)
  from public.auditor_profile p
  join public.user_profile u on u.id = p.user_id
  left join public.place bp on bp.id = p.base_place_id
  where app.is_admin()
  order by
    (case when u.status = 'invited' then 2
          when p.approval_status = 'pending' then 0
          else 1 end),
    u.full_name;
$$;

revoke all on function public.auditor_roster() from public, anon;
grant execute on function public.auditor_roster() to authenticated;
