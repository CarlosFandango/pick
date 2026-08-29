-- ---------------------------------------------------------------------------
-- Booking an audit says where it is.
--
-- Matching joins on `audit.place_id`, so an audit booked without one can never
-- be offered to anybody — it would sit in the queue looking like a coverage
-- problem when it is really a missing field. The caller supplies the place;
-- the postcode stays as the address, for the auditor to navigate by.
--
-- The place is REQUIRED. Deriving it from a postcode would put UK syntax back
-- in the one function every audit passes through, which is the thing this
-- change exists to remove — and a client picking where their agency is working
-- already knows the answer.
--
-- Dropped and recreated: the signature gains a parameter, and `create or
-- replace` would leave the old one callable beside it. That exact overload
-- once let a call bypass every rule added since it was written (PITFALLS).
-- ---------------------------------------------------------------------------

drop function if exists public.book_audit(
  uuid, public.audit_type, public.shift_payment_method, text, date, date, text, text, boolean
);

create function public.book_audit(
  p_organisation_id      uuid,
  p_audit_type           public.audit_type,
  p_shift_payment_method public.shift_payment_method,
  p_postcode             text,
  p_place_id             uuid,
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

  if p_place_id is null or not exists (select 1 from public.place where id = p_place_id) then
    raise exception 'an audit needs a place, so we know who can reach it'
      using errcode = 'check_violation';
  end if;

  insert into public.audit (
    client_organisation_id, status, audit_type, shift_payment_method,
    postcode, place_id, window_start_on, window_end_on, site_name, campaign_name,
    requires_av, created_by, requested_at
  ) values (
    p_organisation_id, 'booked', p_audit_type, p_shift_payment_method,
    p_postcode, p_place_id, p_window_start_on, p_window_end_on, p_site_name, p_campaign_name,
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

revoke all on function public.book_audit(
  uuid, public.audit_type, public.shift_payment_method, text, uuid, date, date, text, text, boolean
) from public, anon;
grant execute on function public.book_audit(
  uuid, public.audit_type, public.shift_payment_method, text, uuid, date, date, text, text, boolean
) to authenticated;
