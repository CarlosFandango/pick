-- ---------------------------------------------------------------------------
-- The reserve / consume / release lifecycle itself (TND-87).
--
-- Separate file from the enum values it uses: Postgres will not let a new enum
-- value be *used* in the transaction that added it, and each migration runs in
-- one transaction.
-- ---------------------------------------------------------------------------

-- Which purchase a reservation drew from, so the price a charity actually paid
-- follows the credit through to the audit it ends up on. Without it, revenue
-- per audit is a guess: a £250 single and a £187.50 bundle credit look
-- identical once they are both "one credit".
alter table public.credit_transaction
  add column source_purchase_id uuid references public.credit_transaction (id);

-- A consumption points at the reservation it settles. That link is what makes
-- "reserved but not yet settled" answerable from the ledger rather than from a
-- status column that could drift out of step with it.
alter table public.credit_transaction
  add column settles_transaction_id uuid references public.credit_transaction (id);

-- Consumption is the one movement that is not a movement: the credit left the
-- balance when it was reserved. It records that the reservation can no longer
-- come back.
alter table public.credit_transaction drop constraint delta_non_zero;
alter table public.credit_transaction
  add constraint delta_non_zero_unless_settling
  check (delta <> 0 or reason = 'consumption');

alter table public.credit_transaction
  add constraint consumption_settles_a_reservation
  check (reason <> 'consumption' or settles_transaction_id is not null);

-- The old index named the old value. One reservation per audit, still.
drop index if exists public.credit_transaction_one_booking_per_audit;
create unique index credit_transaction_one_reservation_per_audit
  on public.credit_transaction (audit_id) where reason = 'reservation';

-- An audit is settled once, across the whole table.
create unique index credit_transaction_one_consumption_per_audit
  on public.credit_transaction (audit_id) where reason = 'consumption';

-- ---------------------------------------------------------------------------
-- What a charity holds, in the five figures TND-87 asks for.
--
-- Every one is a fold over the ledger. There is no stored balance to drift,
-- and a charity can add up the same numbers from the movements they can see.
-- ---------------------------------------------------------------------------
create or replace view public.organisation_credit_position
with (security_invoker = true) as
  select
    organisation_id,
    coalesce(sum(delta) filter (where reason = 'purchase'), 0)::integer      as purchased,
    coalesce(sum(-delta) filter (where reason = 'reservation'), 0)::integer  as reserved_ever,
    coalesce(count(*) filter (where reason = 'consumption'), 0)::integer     as consumed,
    coalesce(sum(delta) filter (where reason = 'release'), 0)::integer       as released,
    coalesce(sum(delta) filter (where reason = 'refund'), 0)::integer        as refunded,
    coalesce(sum(delta), 0)::integer                                         as available
  from public.credit_transaction
  group by organisation_id;

grant select on public.organisation_credit_position to authenticated;

-- ---------------------------------------------------------------------------
-- The oldest purchase with capacity left. FIFO by purchase date, per TND-87.
--
-- Capacity = what was bought, less the reservations drawn from it that were
-- not handed back. A released reservation frees its credit again, and the next
-- booking may legitimately draw the same one.
-- ---------------------------------------------------------------------------
create or replace function public.next_purchase_to_draw_from(p_organisation_id uuid)
returns public.credit_transaction
language sql
stable
set search_path = public, pg_temp
as $$
  select p.*
  from public.credit_transaction p
  where p.organisation_id = p_organisation_id
    and p.reason = 'purchase'
    and p.delta > (
      select coalesce(count(*), 0)
      from public.credit_transaction r
      where r.source_purchase_id = p.id
        and r.reason = 'reservation'
        and not exists (
          select 1 from public.credit_transaction rel
          where rel.settles_transaction_id = r.id and rel.reason = 'release'
        )
    )
  order by p.occurred_at, p.id
  limit 1
$$;

-- ---------------------------------------------------------------------------
-- Reserve at booking, atomically.
--
-- The organisation row is locked first. Without it this is a read-then-write:
-- two bookings against a last remaining credit both read a balance of 1 and
-- both succeed. TND-87 asks for a lock or a constraint rather than an
-- application-level check, and a lock is the smaller of the two here.
-- ---------------------------------------------------------------------------
create or replace function public.book_audit(
  p_organisation_id      uuid,
  p_audit_type           public.audit_type,
  p_shift_payment_method public.shift_payment_method,
  p_postcode             text,
  p_window_start_on      date,
  p_window_end_on        date,
  p_site_name            text default null,
  p_campaign_name        text default null,
  p_requires_av          boolean default false
)
returns public.audit
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller   uuid := auth.uid();
  v_role     public.app_role;
  v_org      uuid;
  v_balance  integer;
  v_audit    public.audit;
  v_lead     integer := public.booking_lead_days();
  v_purchase public.credit_transaction;
begin
  if v_caller is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;

  select role, organisation_id into v_role, v_org
  from public.user_profile where id = v_caller;

  if v_role is distinct from 'pick_admin'
     and (v_role is distinct from 'client' or v_org is distinct from p_organisation_id) then
    raise exception 'not permitted to book for this organisation'
      using errcode = 'insufficient_privilege';
  end if;

  if p_window_end_on - p_window_start_on < 2 then
    raise exception 'the date window must cover at least three days'
      using errcode = 'check_violation';
  end if;

  if p_window_start_on < current_date + v_lead then
    raise exception 'the window must start at least % days from today', v_lead
      using errcode = 'check_violation';
  end if;

  -- Everything after this point is serialised per charity.
  perform 1 from public.organisation where id = p_organisation_id for update;

  select coalesce(sum(delta), 0) into v_balance
  from public.credit_transaction where organisation_id = p_organisation_id;

  if v_balance < 1 then
    raise exception 'no credits available' using errcode = 'check_violation';
  end if;

  insert into public.audit (
    client_organisation_id, status, audit_type, shift_payment_method,
    postcode, window_start_on, window_end_on, site_name, campaign_name,
    requires_av, created_by, requested_at
  ) values (
    p_organisation_id, 'booked', p_audit_type, p_shift_payment_method,
    p_postcode, p_window_start_on, p_window_end_on, p_site_name, p_campaign_name,
    p_requires_av, v_caller, now()
  ) returning * into v_audit;

  v_purchase := public.next_purchase_to_draw_from(p_organisation_id);

  -- The price is fixed at the moment the charity commits, not at release. It
  -- is also fairer: they know what this audit cost them when they book it.
  insert into public.credit_transaction (
    organisation_id, delta, reason, audit_id,
    unit_price_minor_units, source_purchase_id, created_by
  ) values (
    p_organisation_id, -1, 'reservation', v_audit.id,
    coalesce(v_purchase.unit_price_minor_units, public.single_credit_price_minor_units()),
    v_purchase.id, v_caller
  );

  return v_audit;
end;
$$;

-- ---------------------------------------------------------------------------
-- Consume at release: the client has actually received the audit they booked.
--
-- Deliberately not at PICK QA and not at client approval. Payment to the
-- auditor is a separate decision (TND-79) and a client accepting the findings
-- is a third — a credit is consumed because a released audit was delivered.
-- ---------------------------------------------------------------------------
create or replace function public.consume_credit_for(p_audit_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation public.credit_transaction;
begin
  select * into v_reservation
  from public.credit_transaction
  where audit_id = p_audit_id and reason = 'reservation';

  -- Nothing to settle: an audit booked before this lifecycle existed, or one
  -- whose reservation was already handed back. Silent by design — releasing an
  -- audit must not fail over bookkeeping.
  if v_reservation.id is null then return; end if;
  if exists (select 1 from public.credit_transaction
             where settles_transaction_id = v_reservation.id) then
    return;
  end if;

  insert into public.credit_transaction (
    organisation_id, delta, reason, audit_id,
    unit_price_minor_units, source_purchase_id, settles_transaction_id, created_by
  ) values (
    v_reservation.organisation_id, 0, 'consumption', p_audit_id,
    v_reservation.unit_price_minor_units, v_reservation.source_purchase_id,
    v_reservation.id, auth.uid()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Hand the credit back: cancelled, voided, or nobody was there.
-- ---------------------------------------------------------------------------
create or replace function public.release_credit_for(p_audit_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation public.credit_transaction;
begin
  select * into v_reservation
  from public.credit_transaction
  where audit_id = p_audit_id and reason = 'reservation';

  if v_reservation.id is null then return; end if;
  if exists (select 1 from public.credit_transaction
             where settles_transaction_id = v_reservation.id) then
    return;
  end if;

  insert into public.credit_transaction (
    organisation_id, delta, reason, audit_id,
    unit_price_minor_units, source_purchase_id, settles_transaction_id, note, created_by
  ) values (
    v_reservation.organisation_id, 1, 'release', p_audit_id,
    v_reservation.unit_price_minor_units, v_reservation.source_purchase_id,
    v_reservation.id, p_reason, auth.uid()
  );
end;
$$;

revoke all on function public.next_purchase_to_draw_from(uuid) from public, anon;
revoke all on function public.consume_credit_for(uuid) from public, anon;
revoke all on function public.release_credit_for(uuid, text) from public, anon;
grant execute on function public.next_purchase_to_draw_from(uuid) to authenticated;
grant execute on function public.consume_credit_for(uuid) to authenticated;
grant execute on function public.release_credit_for(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- The three moments a reservation is settled, restated to use the lifecycle.
--
-- All three previously wrote a bare `+1 refund` or nothing at all. A refund is
-- money going back; these are a credit that was never spent being handed back,
-- which is a different fact and now reads as one on the charity's ledger.
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

  -- The client has the audit they booked. This is the moment the credit is
  -- actually spent, rather than at booking.
  perform public.consume_credit_for(p_audit_id);

  return v_audit;
end;
$$;

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

  -- The client did not get an audit, so they should not pay for PICK
  -- rejecting its own output.
  perform public.release_credit_for(p_audit_id, 'Audit voided: ' || p_reason);

  return v_audit;
end;
$$;

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

  -- Paid in full: they travelled and waited. PICK absorbs this.
  insert into public.audit_pay_item (audit_id, kind, amount_minor_units, note)
  values (p_audit_id, 'no_show',
          coalesce(v_audit.auditor_fee_minor_units, public.base_audit_fee_minor_units()),
          coalesce(p_note, 'No team present'));

  -- The client is not charged for an audit that never happened.
  perform public.release_credit_for(p_audit_id, 'No team present');

  return v_audit;
end;
$$;

-- ---------------------------------------------------------------------------
-- Drop the stale book_audit overload.
--
-- `create or replace function` with a changed parameter list creates a second
-- function rather than replacing the first, so the 8-argument version from
-- 20260826110000_booking.sql has been sitting alongside the 9-argument one
-- since the A/V flag was added. Two consequences, both bad:
--
--   * a call that omits the last argument is ambiguous and errors
--   * a call that matched the old one would have written the old ledger row,
--     bypassing everything above
--
-- Nothing referenced it — the portal always passes p_requires_av — which is
-- exactly why it went unnoticed.
-- ---------------------------------------------------------------------------
drop function if exists public.book_audit(
  uuid, public.audit_type, public.shift_payment_method, text, date, date, text, text
);
