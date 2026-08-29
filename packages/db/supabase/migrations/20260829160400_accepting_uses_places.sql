-- ---------------------------------------------------------------------------
-- Accepting an invitation now says where you will travel, not which postcodes.
--
-- Two things change, and only one of them is about geography.
--
-- 1. The parameters. An auditor gives a base place, how long they will travel
--    and how, and the places they confirmed — not a list of postcode letters.
--
-- 2. Coverage stops being once-only. The old function refused a second run
--    outright, on the grounds that coverage decides which audits reach an
--    auditor and should not be quietly self-editable. That was the wrong line
--    to draw: travel genuinely changes — somebody buys a car, somebody moves —
--    and refusing to hear about it just makes the data wrong. What must never
--    be self-editable is `approval_status`, and neither this function nor
--    `set_auditor_coverage` touches it.
--
--    Accepting the invitation is still once: `invited → active` happens here
--    and nowhere else. Afterwards, coverage is edited through
--    `set_auditor_coverage`, which records exclusions rather than dropping rows.
--
-- Dropped and recreated rather than replaced: the signature changes, and
-- `create or replace` with different arguments creates a SECOND function while
-- leaving the first callable — the overload trap in PITFALLS that once let a
-- call bypass every rule added since.
-- ---------------------------------------------------------------------------

drop function if exists public.complete_auditor_profile(text, text, text[], public.audit_type[], boolean);

create function public.complete_auditor_profile(
  p_full_name     text,
  p_base_place_id uuid,
  p_minutes       integer,
  p_mode          public.travel_mode,
  p_place_ids     uuid[],
  p_audit_types   public.audit_type[],
  p_av_capable    boolean default false
)
returns public.auditor_profile
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user    uuid := auth.uid();
  v_profile public.auditor_profile;
begin
  if v_user is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from public.user_profile
    where id = v_user and role = 'auditor' and status = 'invited'
  ) then
    raise exception 'this invitation has already been used, or is not yours'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'we need a name to put on the roster' using errcode = 'check_violation';
  end if;

  if p_base_place_id is null then
    raise exception 'we need to know where you set out from' using errcode = 'check_violation';
  end if;

  if coalesce(array_length(p_place_ids, 1), 0) = 0 then
    raise exception 'an auditor works somewhere — pick at least one place'
      using errcode = 'check_violation';
  end if;

  if coalesce(array_length(p_audit_types, 1), 0) = 0 then
    raise exception 'an auditor runs at least one kind of audit'
      using errcode = 'check_violation';
  end if;

  update public.user_profile
     set full_name = trim(p_full_name),
         status    = 'active'
   where id = v_user;

  update public.auditor_profile
     set base_place_id      = p_base_place_id,
         max_travel_minutes = p_minutes,
         travel_mode        = p_mode,
         av_capable         = coalesce(p_av_capable, false)
   where user_id = v_user
  returning * into v_profile;

  delete from public.auditor_coverage where auditor_id = v_user;
  insert into public.auditor_coverage (auditor_id, place_id, source)
  select v_user, id, 'derived' from unnest(p_place_ids) as id
  on conflict do nothing;

  delete from public.auditor_capability where auditor_id = v_user;
  insert into public.auditor_capability (auditor_id, audit_type)
  select distinct v_user, t from unnest(p_audit_types) as t;

  return v_profile;
end;
$$;

revoke all on function public.complete_auditor_profile(
  text, uuid, integer, public.travel_mode, uuid[], public.audit_type[], boolean
) from public, anon;
grant execute on function public.complete_auditor_profile(
  text, uuid, integer, public.travel_mode, uuid[], public.audit_type[], boolean
) to authenticated;
