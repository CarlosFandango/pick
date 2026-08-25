-- ---------------------------------------------------------------------------
-- Slice 1 — S1.1 Book an audit.
--
-- The booking screen asks four things: audit type, the payment method the
-- fundraisers will be taking on the shift, the postcode, and a date window.
-- It never asks for a date, and never offers a choice of auditor.
-- ---------------------------------------------------------------------------

-- The four methodologies. Each implies a different checklist variant.
create type public.audit_type as enum ('street', 'door_to_door', 'private_site', 'lottery');

-- What the fundraisers are taking on the shift. Sets the checklist variant:
-- a direct debit sign-up has obligations a contactless donation does not.
create type public.shift_payment_method as enum ('direct_debit', 'contactless');

alter table public.audit
  add column audit_type public.audit_type not null default 'street',
  add column shift_payment_method public.shift_payment_method not null default 'direct_debit';

-- ---------------------------------------------------------------------------
-- Booking is one transaction: the audit and the credit that paid for it.
--
-- A function rather than two client calls because these must not come apart.
-- An audit with no credit spent is free work; a credit spent with no audit is
-- theft. Neither is recoverable by retrying.
--
-- security definer so it can write credit_transaction, which RLS reserves for
-- admins — the rule that a client may spend their own organisation's credit is
-- enforced here, in one readable place, rather than by widening that policy.
-- ---------------------------------------------------------------------------
create or replace function public.book_audit(
  p_organisation_id      uuid,
  p_audit_type           public.audit_type,
  p_shift_payment_method public.shift_payment_method,
  p_postcode             text,
  p_window_start_on      date,
  p_window_end_on        date,
  p_site_name            text default null,
  p_campaign_name        text default null
)
returns public.audit
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller  uuid := auth.uid();
  v_role    public.app_role;
  v_org     uuid;
  v_balance integer;
  v_audit   public.audit;
begin
  if v_caller is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;

  select role, organisation_id into v_role, v_org
  from public.user_profile where id = v_caller;

  -- A client books for their own charity; an admin may book for any.
  if v_role is distinct from 'pick_admin'
     and (v_role is distinct from 'client' or v_org is distinct from p_organisation_id) then
    raise exception 'not permitted to book for this organisation'
      using errcode = 'insufficient_privilege';
  end if;

  -- The window is at least three days. The client picks a window, never the
  -- shift date: a fundraising team that knows the date is not being observed
  -- doing what it normally does.
  if p_window_end_on - p_window_start_on < 2 then
    raise exception 'the date window must cover at least three days'
      using errcode = 'check_violation';
  end if;

  -- Balance is the sum of an append-only ledger, read inside this transaction.
  select coalesce(sum(delta), 0) into v_balance
  from public.credit_transaction where organisation_id = p_organisation_id;

  if v_balance < 1 then
    raise exception 'no credits available' using errcode = 'check_violation';
  end if;

  insert into public.audit (
    client_organisation_id, status, audit_type, shift_payment_method,
    postcode, window_start_on, window_end_on, site_name, campaign_name,
    created_by, requested_at
  ) values (
    p_organisation_id, 'booked', p_audit_type, p_shift_payment_method,
    p_postcode, p_window_start_on, p_window_end_on, p_site_name, p_campaign_name,
    v_caller, now()
  ) returning * into v_audit;

  -- One credit, spent. The unique partial index on (audit_id) where
  -- reason = 'booking' makes a double charge impossible even if this runs twice.
  insert into public.credit_transaction (
    organisation_id, delta, reason, audit_id, unit_price_pence, created_by
  ) values (
    p_organisation_id, -1, 'booking', v_audit.id, 17500, v_caller
  );

  return v_audit;
end;
$$;

comment on function public.book_audit is
  'Books an audit and spends one credit in a single transaction. S1.1.';

revoke all on function public.book_audit from public, anon;
grant execute on function public.book_audit to authenticated;
