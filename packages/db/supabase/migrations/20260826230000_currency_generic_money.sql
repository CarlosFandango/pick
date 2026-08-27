-- ---------------------------------------------------------------------------
-- Take sterling out of the column names.
--
-- Money stays an integer count of a currency's smallest unit. What changes is
-- that the schema no longer says which currency that is. `_pence` baked the
-- assumption into every money column and two function names, and
-- organisation.residency_zone already models `eea` and `other` — so this was
-- always going to be renamed, and it will never be cheaper than now, with no
-- production data.
--
-- `alter ... rename` throughout rather than add/backfill/drop: renaming keeps
-- the same object, so grants, defaults, check constraints and view references
-- all follow it, and no row is rewritten.
--
-- What this migration deliberately does NOT do: add a currency column. There
-- is one currency today, and a column repeating 'GBP' on every row is not a
-- record of a decision — it is a constant with storage. The decision worth
-- capturing is "what is this charity billed in", and it belongs on
-- organisation when a second currency is actually in prospect.
-- ---------------------------------------------------------------------------

alter table public.audit rename column price_pence to price_minor_units;
alter table public.audit rename column auditor_fee_pence to auditor_fee_minor_units;
alter table public.audit_offer rename column travel_uplift_pence to travel_uplift_minor_units;
alter table public.audit_pay_item rename column amount_pence to amount_minor_units;
alter table public.credit_transaction rename column unit_price_pence to unit_price_minor_units;
alter table public.payout_run rename column total_pence to total_minor_units;
alter table public.payout_line_item rename column amount_pence to amount_minor_units;

-- Renaming the function keeps its OID, so the column default that calls it and
-- the grants already made on it follow without being restated.
alter function public.default_travel_uplift_pence() rename to default_travel_uplift_minor_units;
alter function public.base_audit_fee_pence() rename to base_audit_fee_minor_units;

-- What one credit costs. It was a literal inside book_audit and a second
-- literal as the default on audit.price_minor_units — two copies of a number
-- that must never disagree, in the one place where disagreeing would mean
-- charging a charity something other than what was quoted.
create or replace function public.credit_price_minor_units()
returns integer language sql immutable as $$ select 17500 $$;

alter table public.audit
  alter column price_minor_units set default public.credit_price_minor_units();

-- ---------------------------------------------------------------------------
-- Function bodies are text to Postgres, so a column rename does not reach
-- inside plpgsql. These three name a renamed column and must be restated.
-- Behaviour is unchanged; only the identifiers move.
-- ---------------------------------------------------------------------------

create or replace function public.accept_offer(p_offer_id uuid)
returns public.audit
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_offer  public.audit_offer;
  v_audit  public.audit;
  v_base   integer := public.base_audit_fee_minor_units();
begin
  select * into v_offer from public.audit_offer where id = p_offer_id for update;

  if v_offer.id is null then
    raise exception 'no such offer' using errcode = 'no_data_found';
  end if;
  if v_offer.auditor_id is distinct from auth.uid() then
    raise exception 'this offer is not yours' using errcode = 'insufficient_privilege';
  end if;
  if v_offer.outcome <> 'offered' then
    raise exception 'this offer is already %', v_offer.outcome using errcode = 'check_violation';
  end if;
  if v_offer.expires_at is not null and v_offer.expires_at < now() then
    raise exception 'this offer has expired' using errcode = 'check_violation';
  end if;

  -- Lock the audit before checking: two auditors accepting at the same instant
  -- must not both win.
  select * into v_audit from public.audit where id = v_offer.audit_id for update;
  if v_audit.status <> 'booked' then
    raise exception 'this audit is no longer available' using errcode = 'check_violation';
  end if;

  update public.audit_offer
     set outcome = 'accepted', responded_at = now()
   where id = p_offer_id;

  -- Everyone else finds out it is gone, rather than accepting into a wall.
  update public.audit_offer
     set outcome = 'withdrawn', responded_at = now()
   where audit_id = v_offer.audit_id and id <> p_offer_id and outcome = 'offered';

  update public.audit
     set auditor_id = v_offer.auditor_id,
         status = 'assigned',
         matched_at = now(),
         auditor_fee_minor_units = v_base + v_offer.travel_uplift_minor_units
   where id = v_offer.audit_id
  returning * into v_audit;

  -- Itemised, always: an auditor should be able to see what each part is for.
  insert into public.audit_pay_item (audit_id, kind, amount_minor_units, note)
  values (v_audit.id, 'base', v_base, 'Audit fee');

  if v_offer.travel_uplift_minor_units > 0 then
    insert into public.audit_pay_item (audit_id, kind, amount_minor_units, note)
    values (v_audit.id, 'travel', v_offer.travel_uplift_minor_units, 'Travel uplift');
  end if;

  return v_audit;
end;
$$;

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
  v_caller  uuid := auth.uid();
  v_role    public.app_role;
  v_org     uuid;
  v_balance integer;
  v_audit   public.audit;
  v_lead    integer := public.booking_lead_days();
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

  insert into public.credit_transaction (
    organisation_id, delta, reason, audit_id, unit_price_minor_units, created_by
  ) values (
    p_organisation_id, -1, 'booking', v_audit.id,
    public.credit_price_minor_units(), v_caller
  );

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

  -- Paid in full: they travelled and waited.
  insert into public.audit_pay_item (audit_id, kind, amount_minor_units, note)
  values (p_audit_id, 'no_show',
          coalesce(v_audit.auditor_fee_minor_units, public.base_audit_fee_minor_units()),
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

revoke all on function public.credit_price_minor_units() from public, anon;
grant execute on function public.credit_price_minor_units() to authenticated;
