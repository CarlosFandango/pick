-- ---------------------------------------------------------------------------
-- Money. Two ledgers: credits in (client side), payouts out (auditor side).
-- ---------------------------------------------------------------------------

-- Append-only. Balance is sum(delta); there is no balance column to drift.
create table public.credit_transaction (
  id                 uuid primary key default public.uuid_generate_v7(),
  organisation_id    uuid not null references public.organisation (id) on delete restrict,
  delta              integer not null,
  reason             public.credit_reason not null,
  audit_id           uuid references public.audit (id) on delete restrict,
  unit_price_pence   integer,
  currency           char(3) not null default 'GBP',
  external_reference text,
  note               text,
  created_by         uuid references public.user_profile (id),
  occurred_at        timestamptz not null default now(),
  recorded_at        timestamptz not null default now(),
  constraint delta_non_zero check (delta <> 0),
  constraint booking_has_audit check (reason <> 'booking' or audit_id is not null)
);

create index credit_transaction_org_idx on public.credit_transaction (organisation_id, occurred_at);

-- One audit can only ever consume one credit.
create unique index credit_transaction_one_booking_per_audit
  on public.credit_transaction (audit_id) where reason = 'booking';

create view public.organisation_credit_balance
with (security_invoker = true) as
  select organisation_id, sum(delta)::integer as balance
  from public.credit_transaction
  group by organisation_id;

-- ---------------------------------------------------------------------------
-- PayoutRun: how we paid is a field, not a schema shape. manual_csv today;
-- bank_api / stripe_connect later write to the same rows.
-- ---------------------------------------------------------------------------
create sequence public.payout_run_reference_seq start 1;

create table public.payout_run (
  id                 uuid primary key default public.uuid_generate_v7(),
  reference          text not null unique
                       default 'PR-' || lpad(nextval('public.payout_run_reference_seq')::text, 5, '0'),
  period_start       date not null,
  period_end         date not null,
  status             public.payout_run_status not null default 'draft',
  execution_method   public.payout_execution_method not null default 'manual_csv',
  currency           char(3) not null default 'GBP',
  total_pence        bigint not null default 0,
  external_reference text,
  created_by         uuid references public.user_profile (id),
  approved_by        uuid references public.user_profile (id),
  approved_at        timestamptz,
  executed_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint period_ordered check (period_end >= period_start)
);

create table public.payout_line_item (
  id                 uuid primary key default public.uuid_generate_v7(),
  payout_run_id      uuid not null references public.payout_run (id) on delete cascade,
  auditor_id         uuid not null references public.auditor_profile (user_id) on delete restrict,
  audit_id           uuid references public.audit (id) on delete restrict,
  amount_pence       bigint not null,
  description        text,
  status             public.payout_line_status not null default 'pending',
  external_reference text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index payout_line_item_run_idx     on public.payout_line_item (payout_run_id);
create index payout_line_item_auditor_idx on public.payout_line_item (auditor_id);

-- An audit is paid out exactly once, across all runs.
create unique index payout_line_item_one_per_audit
  on public.payout_line_item (audit_id) where audit_id is not null;

create trigger payout_run_touch before update on public.payout_run
  for each row execute function app.touch_updated_at();
create trigger payout_line_item_touch before update on public.payout_line_item
  for each row execute function app.touch_updated_at();
