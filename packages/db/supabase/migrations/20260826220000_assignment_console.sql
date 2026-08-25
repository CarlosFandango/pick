-- ---------------------------------------------------------------------------
-- Phase 4 — S4.2 Assignment console.
--
-- The algorithm shows its work. `eligible_auditors` deliberately omits anyone
-- who does not qualify — a marketplace should not carry a list of people it
-- will not use. An operator deciding why an audit has not been taken needs the
-- opposite: everyone considered, and the reason each was set aside.
--
-- Same six sets, evaluated per auditor rather than as a filter.
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
    select id, client_organisation_id, postcode_area, audit_type,
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
               where c.auditor_id = ap.user_id and c.postcode_area = t.postcode_area) as reachable,
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
      case when not reachable    then 'Does not cover this area' end,
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

revoke all on function public.assignment_console(uuid) from public, anon;
grant execute on function public.assignment_console(uuid) to authenticated;
