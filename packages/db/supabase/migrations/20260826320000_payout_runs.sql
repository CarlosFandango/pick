-- ---------------------------------------------------------------------------
-- S4.7 — building a payout run.
--
-- Money out. `payout_run` and `payout_line_item` have existed since the first
-- migration; nothing has ever written to them, so this is the builder.
--
-- What decides whether an audit is payable is the review gate (TND-81), NOT
-- whether the client accepted the findings. An auditor whose fee waits on the
-- subject of the audit being happy with it is an auditor with a reason to
-- write a softer audit — which is the exact structure this product exists to
-- argue against, one layer down.
--
-- So: an audit is payable when it has pay items, has reached a terminal state,
-- and its payment gate is not holding. A client-release hold is irrelevant
-- here, by design.
--
-- The rails stay swappable. `execution_method` is a field on the run, and
-- marking a run executed writes to the same rows whichever rail did it.
-- ---------------------------------------------------------------------------

/**
 * Everything owed and not yet on a run.
 *
 * The unique partial index on `payout_line_item(audit_id)` already makes it
 * impossible to pay an audit twice across every run; this simply does not
 * offer it a second time.
 */
create or replace function public.payable_audits()
returns table (
  audit_id         uuid,
  reference        text,
  auditor_id       uuid,
  auditor_name     text,
  amount_minor_units bigint,
  completed_at     timestamptz,
  gate             public.review_gate_mode
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    a.id,
    a.reference,
    a.auditor_id,
    u.full_name,
    sum(p.amount_minor_units)::bigint,
    a.completed_at,
    (public.audit_gate_state(a.id)).payment
  from public.audit a
  join public.audit_pay_item p on p.audit_id = a.id
  join public.user_profile u on u.id = a.auditor_id
  where app.is_admin()
    and a.auditor_id is not null
    -- Terminal for pay purposes. A no-show is included on purpose: the
    -- auditor travelled and waited, and is paid in full.
    and a.status in ('released', 'no_team_present')
    and not exists (
      select 1 from public.payout_line_item l where l.audit_id = a.id
    )
  group by a.id, a.reference, a.auditor_id, u.full_name, a.completed_at
  order by a.completed_at nulls last, a.reference
$$;

/**
 * Draft a run from everything currently payable and not gated.
 *
 * Audits whose payment gate is holding are left off rather than added and
 * marked `held`: a run is a payment instruction, and an instruction listing
 * money that must not move yet is a mistake waiting for a tired operator.
 */
create or replace function public.build_payout_run(
  p_period_start date,
  p_period_end   date
)
returns public.payout_run
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run   public.payout_run;
  v_total bigint := 0;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may build a payout run'
      using errcode = 'insufficient_privilege';
  end if;
  if p_period_end < p_period_start then
    raise exception 'the period ends before it starts' using errcode = 'check_violation';
  end if;

  insert into public.payout_run (period_start, period_end, created_by)
  values (p_period_start, p_period_end, auth.uid())
  returning * into v_run;

  insert into public.payout_line_item (
    payout_run_id, auditor_id, audit_id, amount_minor_units, description
  )
  select
    v_run.id, pa.auditor_id, pa.audit_id, pa.amount_minor_units,
    pa.reference || ' — ' || to_char(pa.completed_at, 'DD Mon YYYY')
  from public.payable_audits() pa
  where pa.gate <> 'hold'
    and pa.completed_at::date between p_period_start and p_period_end;

  select coalesce(sum(amount_minor_units), 0) into v_total
  from public.payout_line_item where payout_run_id = v_run.id;

  update public.payout_run set total_minor_units = v_total where id = v_run.id
  returning * into v_run;

  return v_run;
end;
$$;

/**
 * Approve a run, then mark it executed once the money has actually moved.
 *
 * Two steps because they are two decisions by potentially two people, and
 * because `executed` is a claim about the outside world that this database
 * cannot verify. `external_reference` is the opaque pointer into whichever
 * rail was used — never bank details.
 */
create or replace function public.approve_payout_run(p_run_id uuid)
returns public.payout_run
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run public.payout_run;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may approve a payout run'
      using errcode = 'insufficient_privilege';
  end if;

  update public.payout_run
     set status = 'approved', approved_by = auth.uid(), approved_at = now()
   where id = p_run_id and status = 'draft'
  returning * into v_run;

  if v_run.id is null then
    raise exception 'only a draft run can be approved' using errcode = 'check_violation';
  end if;
  if v_run.total_minor_units = 0 then
    raise exception 'this run pays nothing' using errcode = 'check_violation';
  end if;

  return v_run;
end;
$$;

create or replace function public.execute_payout_run(
  p_run_id             uuid,
  p_external_reference text
)
returns public.payout_run
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run public.payout_run;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may execute a payout run'
      using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_external_reference), '') = '' then
    raise exception 'record the reference the payment was made under'
      using errcode = 'check_violation';
  end if;

  update public.payout_run
     set status = 'executed', executed_at = now(), external_reference = trim(p_external_reference)
   where id = p_run_id and status = 'approved'
  returning * into v_run;

  if v_run.id is null then
    raise exception 'only an approved run can be executed' using errcode = 'check_violation';
  end if;

  update public.payout_line_item
     set status = 'paid', external_reference = trim(p_external_reference)
   where payout_run_id = p_run_id and status = 'pending';

  return v_run;
end;
$$;

revoke all on function public.payable_audits() from public, anon;
revoke all on function public.build_payout_run(date, date) from public, anon;
revoke all on function public.approve_payout_run(uuid) from public, anon;
revoke all on function public.execute_payout_run(uuid, text) from public, anon;
grant execute on function public.payable_audits() to authenticated;
grant execute on function public.build_payout_run(date, date) to authenticated;
grant execute on function public.approve_payout_run(uuid) to authenticated;
grant execute on function public.execute_payout_run(uuid, text) to authenticated;
