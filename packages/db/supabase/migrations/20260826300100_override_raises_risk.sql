-- ---------------------------------------------------------------------------
-- Two classes of override, and only one is waivable (TND-82).
--
--   conflict    HARD BLOCK. Not waivable by the client. Independence is not
--               theirs to waive — a hand-picked auditor they have a
--               relationship with is not defensible to a regulator regardless
--               of how comfortable they are with it. `prefer_auditor` already
--               refuses this and there is deliberately no parameter that
--               proceeds anyway.
--
--   exposure    SOFT. Warn, allow, log — and raise a risk automatically, so
--               PICK can follow up and advise. That advisory is the record
--               that makes the whole thing defensible later.
--
-- The override itself is recorded either way. A client repeatedly steering
-- toward the same auditor is the reciprocity pattern the conflict policy
-- exists to catch, and it is only visible if every override is written down.
-- ---------------------------------------------------------------------------

create or replace function public.prefer_auditor(p_audit_id uuid, p_code text)
returns public.audit
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_audit    public.audit;
  v_auditor  uuid;
  v_familiar boolean;
  v_risk     public.risk;
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

  -- Hard block. Unchanged, and deliberately unwaivable.
  if exists (
    select 1 from public.auditor_conflict
    where auditor_id = v_auditor and organisation_id = v_audit.client_organisation_id
  ) then
    raise exception 'that auditor has a declared conflict with your organisation'
      using errcode = 'check_violation';
  end if;

  -- Soft. Has this auditor seen this charity's teams inside the exposure
  -- window? If so they are becoming recognisable, which degrades the audit
  -- without invalidating it.
  select exists (
    select 1 from public.audit a
    where a.auditor_id = v_auditor
      and a.client_organisation_id = v_audit.client_organisation_id
      and a.completed_at > now() - make_interval(days => public.exposure_window_days())
  ) into v_familiar;

  if v_familiar then
    v_risk := public.raise_risk(
      'exposure',
      'assignment',
      p_audit_id,
      format(
        'Client chose auditor %s, who has audited them within the last %s days. '
        || 'Repeat exposure makes an auditor recognisable to the team being observed.',
        upper(p_code), public.exposure_window_days()
      ),
      'medium',
      v_audit.client_organisation_id
    );
  end if;

  update public.audit set preferred_auditor_id = v_auditor where id = p_audit_id
  returning * into v_audit;

  insert into public.assignment_override (
    audit_id, chosen_auditor_id, overridden_by, risk_id
  ) values (
    p_audit_id, v_auditor, auth.uid(), v_risk.id
  );

  return v_audit;
end;
$$;
