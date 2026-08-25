-- ---------------------------------------------------------------------------
-- S3.2 — auditor override picker.
--
-- An optional path off the booking wizard. Assignment is normally automatic;
-- picking is the exception, and the wizard itself still offers no choice.
--
-- Auditors are shown to clients CODED, never named — the same rule the report
-- follows. The code is derived from the auditor and the charity together, so
-- it is stable for that charity (they can re-pick someone they rate) and
-- meaningless to anyone else. It is not reversible into an identity, and two
-- charities see different codes for the same person.
-- ---------------------------------------------------------------------------

alter table public.audit
  add column preferred_auditor_id uuid references public.auditor_profile (user_id) on delete set null;

create or replace function public.auditor_code_for(p_auditor_id uuid, p_organisation_id uuid)
returns text
language sql
immutable
as $$
  select upper(substr(md5(p_auditor_id::text || ':' || p_organisation_id::text), 1, 6));
$$;

/**
 * Auditors a charity may pick from, coded.
 *
 * Returns three states rather than a filtered list, because the point of the
 * screen is to show why someone cannot be chosen:
 *   available   — nothing in the way
 *   familiarity — has seen this charity's teams recently; proceed with a warning
 *   blocked     — a declared conflict; no override exists
 */
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
      where c.auditor_id = ap.user_id and c.postcode_area = p_postcode_area
    )
    and exists (
      select 1 from public.auditor_capability k
      where k.auditor_id = ap.user_id and k.audit_type = p_audit_type
    )
  order by 3 desc;
$$;

/**
 * Record a preference on a booked audit.
 *
 * Takes the code, not an id: the client was never given an identity and does
 * not get to send one back. A conflicted auditor is refused outright — there
 * is deliberately no parameter that proceeds anyway.
 */
create or replace function public.prefer_auditor(p_audit_id uuid, p_code text)
returns public.audit
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_audit   public.audit;
  v_auditor uuid;
begin
  select * into v_audit from public.audit where id = p_audit_id for update;
  if v_audit.id is null then
    raise exception 'no such audit' using errcode = 'no_data_found';
  end if;
  if not app.is_admin() and v_audit.client_organisation_id is distinct from app.current_org() then
    raise exception 'not your audit' using errcode = 'insufficient_privilege';
  end if;
  if v_audit.status <> 'booked' then
    raise exception 'an auditor can only be preferred before the audit is assigned'
      using errcode = 'check_violation';
  end if;

  select ap.user_id into v_auditor
  from public.auditor_profile ap
  where public.auditor_code_for(ap.user_id, v_audit.client_organisation_id) = upper(p_code);

  if v_auditor is null then
    raise exception 'no auditor with that code' using errcode = 'no_data_found';
  end if;

  if exists (
    select 1 from public.auditor_conflict
    where auditor_id = v_auditor and organisation_id = v_audit.client_organisation_id
  ) then
    raise exception 'that auditor has a declared conflict with your organisation'
      using errcode = 'check_violation';
  end if;

  update public.audit set preferred_auditor_id = v_auditor where id = p_audit_id
  returning * into v_audit;

  return v_audit;
end;
$$;

revoke all on function public.selectable_auditors(uuid, text, public.audit_type, boolean) from public, anon;
revoke all on function public.prefer_auditor(uuid, text) from public, anon;
grant execute on function public.selectable_auditors(uuid, text, public.audit_type, boolean) to authenticated;
grant execute on function public.prefer_auditor(uuid, text) to authenticated;
