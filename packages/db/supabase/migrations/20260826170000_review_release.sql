-- ---------------------------------------------------------------------------
-- Slices 8 and 9 — S1.7 Review, and release.
--
-- Three actions on a held audit: approve and release, return to the auditor,
-- or void it. Approve is the primary path; the others are exceptions.
-- ---------------------------------------------------------------------------

-- The first three audits an auditor files are gated for PICK review. After
-- that an audit is only held if something asks for it.
create or replace function public.review_gate_audits()
returns integer language sql immutable as $$ select 3 $$;

/**
 * Why this audit is being held, in words a reviewer can act on — or null if
 * it is not gated at all.
 */
create or replace function public.review_gate_reason(p_audit_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_auditor  uuid;
  v_released integer;
  v_gate     integer := public.review_gate_audits();
begin
  select auditor_id into v_auditor from public.audit where id = p_audit_id;
  if v_auditor is null then return null; end if;

  select count(*) into v_released
  from public.audit
  where auditor_id = v_auditor and status = 'released' and id <> p_audit_id;

  if v_released >= v_gate then return null; end if;

  return format(
    'Auditor''s first %s audits are gated for review. This is audit %s of %s.',
    v_gate, v_released + 1, v_gate
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Release: the client can finally see the report.
-- ---------------------------------------------------------------------------
create or replace function public.release_audit(p_audit_id uuid)
returns public.audit
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_audit public.audit;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may release an audit'
      using errcode = 'insufficient_privilege';
  end if;

  update public.audit
     set status = 'released', released_at = now(), released_by = auth.uid(),
         completed_at = now()
   where id = p_audit_id and status = 'in_review'
  returning * into v_audit;

  if v_audit.id is null then
    raise exception 'only an audit in review can be released' using errcode = 'check_violation';
  end if;

  return v_audit;
end;
$$;

-- ---------------------------------------------------------------------------
-- Void: the work is not usable. The client did not get an audit, so the
-- credit goes back — they should not pay for PICK rejecting its own output.
-- ---------------------------------------------------------------------------
create or replace function public.void_audit(p_audit_id uuid, p_reason text)
returns public.audit
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_audit public.audit;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may void an audit'
      using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'say why the audit is being voided' using errcode = 'check_violation';
  end if;

  update public.audit
     set status = 'cancelled', cancelled_at = now(), cancellation_reason = p_reason
   where id = p_audit_id and status in ('in_review', 'in_progress', 'assigned')
  returning * into v_audit;

  if v_audit.id is null then
    raise exception 'this audit cannot be voided' using errcode = 'check_violation';
  end if;

  insert into public.credit_transaction (
    organisation_id, delta, reason, audit_id, note, created_by
  ) values (
    v_audit.client_organisation_id, 1, 'refund', p_audit_id,
    'Audit voided: ' || p_reason, auth.uid()
  );

  return v_audit;
end;
$$;

-- ---------------------------------------------------------------------------
-- No team present: not a failure. The auditor is paid in full and the client's
-- credit is returned, because neither of them did anything wrong.
-- ---------------------------------------------------------------------------
create or replace function public.report_no_team_present(p_audit_id uuid, p_note text default null)
returns public.audit
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_audit public.audit;
begin
  select * into v_audit from public.audit where id = p_audit_id for update;

  if v_audit.id is null then
    raise exception 'no such audit' using errcode = 'no_data_found';
  end if;
  if v_audit.auditor_id is distinct from auth.uid() and not app.is_admin() then
    raise exception 'this audit is not yours' using errcode = 'insufficient_privilege';
  end if;
  if v_audit.status not in ('assigned', 'in_progress') then
    raise exception 'this audit cannot be reported as no-show from %', v_audit.status
      using errcode = 'check_violation';
  end if;

  update public.audit
     set status = 'no_team_present', no_team_present_at = now(), completed_at = now()
   where id = p_audit_id
  returning * into v_audit;

  -- Paid in full: they travelled and waited.
  insert into public.audit_pay_item (audit_id, kind, amount_pence, note)
  values (p_audit_id, 'no_show', coalesce(v_audit.auditor_fee_pence, public.base_audit_fee_pence()),
          coalesce(p_note, 'No team present'));

  insert into public.credit_transaction (
    organisation_id, delta, reason, audit_id, note, created_by
  ) values (
    v_audit.client_organisation_id, 1, 'refund', p_audit_id,
    'No team present', auth.uid()
  );

  return v_audit;
end;
$$;

revoke all on function public.review_gate_reason(uuid) from public, anon;
revoke all on function public.release_audit(uuid) from public, anon;
revoke all on function public.void_audit(uuid, text) from public, anon;
revoke all on function public.report_no_team_present(uuid, text) from public, anon;
grant execute on function public.review_gate_reason(uuid) to authenticated;
grant execute on function public.release_audit(uuid) to authenticated;
grant execute on function public.void_audit(uuid, text) to authenticated;
grant execute on function public.report_no_team_present(uuid, text) to authenticated;
