-- ---------------------------------------------------------------------------
-- One window for "has this charity seen this auditor recently".
--
-- `eligible_auditors` excludes an auditor seen within `exposure_window_days()`
-- — 90. `selectable_auditors`, added later for the S3.2 override picker, warned
-- on 60, written out as a literal in the query and again inside the warning
-- text shown to the client. Same charity-facing idea, two answers depending on
-- which screen asked, and the named constant that exists to prevent exactly
-- that was sitting one file away.
--
-- 90 wins because it is the one that was reasoned about: it is the rotation
-- rule assignment already enforces. If the warning window should ever differ
-- from the exclusion window, that is a second named function and a line in the
-- decision log, not a number in a query.
--
-- Note this widens the warning from 60 days to 90, so a client picking an
-- auditor sees the familiarity note in more cases than before. That is the
-- point: assignment was already going to treat those auditors as too recently
-- exposed.
-- ---------------------------------------------------------------------------

create or replace function public.selectable_auditors(
  p_organisation_id uuid,
  p_postcode_area   text,
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
      and a.window_end_on > current_date - public.exposure_window_days()
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
          'Familiarity warning — has audited your teams %s times in %s days. You can proceed; PICK will follow up on rotation.',
          r.seen, public.exposure_window_days()
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
      where c.auditor_id = ap.user_id and c.postcode_area = p_postcode_area
    )
    and exists (
      select 1 from public.auditor_capability k
      where k.auditor_id = ap.user_id and k.audit_type = p_audit_type
    )
  order by 3 desc;
$$;


revoke all on function public.selectable_auditors(uuid, text, public.audit_type, boolean) from public, anon;
grant execute on function public.selectable_auditors(uuid, text, public.audit_type, boolean) to authenticated;
