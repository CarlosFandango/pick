-- ---------------------------------------------------------------------------
-- S4.3 — the auditors screen, and the one decision on it that matters.
--
-- Approving an auditor is what lets them be offered work at all, so it is the
-- gate the whole marketplace hangs on. It is a security-definer function
-- rather than a table write for the same reason every other ops action is:
-- the rule lives in one place, re-checks the caller itself, and is exercised
-- by `pnpm test:rls` as `authenticated`.
--
-- `approve_auditor` and `suspend_auditor` rather than one function taking a
-- status. Two things happen for different reasons and leave different traces,
-- and a single `set_status(x)` would make the audit trail say less than the
-- act did.
-- ---------------------------------------------------------------------------

create or replace function public.auditor_roster()
returns table (
  auditor_id        uuid,
  full_name         text,
  approval_status   public.auditor_approval_status,
  approved_at       timestamptz,
  base_postcode     text,
  av_capable        boolean,
  areas             text[],
  audit_types       public.audit_type[],
  audits_completed  integer,
  open_conflicts    integer
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    p.user_id,
    u.full_name,
    p.approval_status,
    p.approved_at,
    p.base_postcode,
    p.av_capable,
    coalesce((select array_agg(c.postcode_area order by c.postcode_area)
              from public.auditor_coverage c where c.auditor_id = p.user_id), '{}'),
    coalesce((select array_agg(k.audit_type order by k.audit_type)
              from public.auditor_capability k where k.auditor_id = p.user_id), '{}'),
    (select count(*)::integer from public.audit a
      where a.auditor_id = p.user_id and a.status = 'released'),
    (select count(*)::integer from public.auditor_conflict f where f.auditor_id = p.user_id)
  from public.auditor_profile p
  join public.user_profile u on u.id = p.user_id
  where app.is_admin()
  order by
    case p.approval_status when 'pending' then 0 else 1 end,
    u.full_name
$$;

create or replace function public.approve_auditor(p_auditor_id uuid)
returns public.auditor_profile
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.auditor_profile;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may approve an auditor'
      using errcode = 'insufficient_privilege';
  end if;

  update public.auditor_profile
     set approval_status = 'approved', approved_at = now(), approved_by = auth.uid()
   where user_id = p_auditor_id
  returning * into v_profile;

  if v_profile.user_id is null then
    raise exception 'no such auditor' using errcode = 'no_data_found';
  end if;

  return v_profile;
end;
$$;

create or replace function public.suspend_auditor(p_auditor_id uuid, p_reason text)
returns public.auditor_profile
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.auditor_profile;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may suspend an auditor'
      using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required to suspend an auditor'
      using errcode = 'check_violation';
  end if;

  -- Suspending stops future offers. It deliberately does not touch audits
  -- already accepted: the auditor still did that work and is still owed for it.
  update public.auditor_profile
     set approval_status = 'suspended'
   where user_id = p_auditor_id
  returning * into v_profile;

  if v_profile.user_id is null then
    raise exception 'no such auditor' using errcode = 'no_data_found';
  end if;

  update public.user_profile set status = 'suspended' where id = p_auditor_id;

  return v_profile;
end;
$$;

revoke all on function public.auditor_roster() from public, anon;
revoke all on function public.approve_auditor(uuid) from public, anon;
revoke all on function public.suspend_auditor(uuid, text) from public, anon;
grant execute on function public.auditor_roster() to authenticated;
grant execute on function public.approve_auditor(uuid) to authenticated;
grant execute on function public.suspend_auditor(uuid, text) to authenticated;
