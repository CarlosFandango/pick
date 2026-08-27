-- ---------------------------------------------------------------------------
-- Credits are sold in bundles, and the price per credit depends on the bundle.
--
-- Supersedes the single £175 figure (TND-87). Pricing from Jaz's Auditing
-- Roadmap v1.0:
--
--   1 credit  £250    £250.00 each
--   2 credits £450    £225.00 each
--   3 credits £600    £200.00 each
--   4 credits £750    £187.50 each
--   8 credits £1,500  £187.50 each
--
-- A table rather than an `as const` in core, which is the house default for a
-- closed set. Two reasons it earns the table: a purchase must reference the
-- bundle it came from so `unit_price_minor_units` on the ledger row stays
-- truthful when the price list changes, and a price that lived in code would
-- rewrite the history of every past purchase on deploy.
--
-- Not in this migration: reserve-at-booking, consume-at-release, FIFO
-- consumption by purchase date, or per-credit effective price at consumption.
-- Those are the rest of TND-87 and they change the lifecycle, not the price
-- list. `book_audit` still spends one credit at booking.
-- ---------------------------------------------------------------------------

create table public.credit_bundle (
  id                 uuid primary key default public.uuid_generate_v7(),
  quantity           integer not null,
  price_minor_units  integer not null,
  currency           char(3) not null default 'GBP',
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint credit_bundle_quantity_positive check (quantity > 0),
  constraint credit_bundle_price_positive check (price_minor_units > 0)
);

-- One active bundle per size. An inactive one is kept, not deleted: a past
-- purchase points at the bundle it was actually bought under.
create unique index credit_bundle_active_quantity_idx
  on public.credit_bundle (quantity) where is_active;

create trigger credit_bundle_touch before update on public.credit_bundle
  for each row execute function app.touch_updated_at();

insert into public.credit_bundle (quantity, price_minor_units) values
  (1,  25000),
  (2,  45000),
  (3,  60000),
  (4,  75000),
  (8, 150000);

-- ---------------------------------------------------------------------------
-- Everyone signed in may read the price list — a charity cannot decide what to
-- buy without it. Only PICK may change it.
-- ---------------------------------------------------------------------------
alter table public.credit_bundle enable row level security;

grant select on public.credit_bundle to authenticated;
grant insert, update, delete on public.credit_bundle to authenticated;

create policy credit_bundle_read on public.credit_bundle
  for select to authenticated using (true);

create policy credit_bundle_admin_write on public.credit_bundle
  for all to authenticated using (app.is_admin()) with check (app.is_admin());

-- ---------------------------------------------------------------------------
-- The list price of a single credit, read from the table rather than frozen in
-- a function body. `stable` not `immutable`: it reads a row, so it cannot be
-- folded into an index or cached across statements.
-- ---------------------------------------------------------------------------
create or replace function public.single_credit_price_minor_units()
returns integer
language sql
stable
set search_path = public, pg_temp
as $$
  select price_minor_units from public.credit_bundle
  where quantity = 1 and is_active
$$;

-- Must move before the old function can be dropped: a column default holds a
-- dependency on the function it calls.
alter table public.audit
  alter column price_minor_units set default public.single_credit_price_minor_units();

drop function public.credit_price_minor_units();

-- ---------------------------------------------------------------------------
-- book_audit quoted the old constant. Restated with the new source; nothing
-- else about it changes.
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

  -- The price actually paid for THIS credit is a FIFO question once bundles
  -- are consumed properly (TND-87). Until then the list price of a single
  -- credit is the honest answer, and it is recorded on the row either way.
  insert into public.credit_transaction (
    organisation_id, delta, reason, audit_id, unit_price_minor_units, created_by
  ) values (
    p_organisation_id, -1, 'booking', v_audit.id,
    public.single_credit_price_minor_units(), v_caller
  );

  return v_audit;
end;
$$;

revoke all on function public.single_credit_price_minor_units() from public, anon;
grant execute on function public.single_credit_price_minor_units() to authenticated;
