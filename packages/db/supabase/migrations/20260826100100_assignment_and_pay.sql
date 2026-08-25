-- ---------------------------------------------------------------------------
-- Assignment reasoning, no-show handling and auditor pay.
--
-- Eligibility is REACHABLE ∧ APPROVED ∧ CAPABLE ∧ AVAILABLE ∧ EXPOSURE-ok ∧
-- NO-CONFLICT, and the *reason* an auditor was assigned has to be stored — a
-- marketplace that cannot say why it picked someone cannot defend the pick.
--
-- Deliberately a record of the decision, not an engine that makes it. The
-- decision is enumerated in code where it can be tested.
-- ---------------------------------------------------------------------------

create type public.assignment_outcome as enum ('offered', 'accepted', 'declined', 'expired', 'withdrawn');

-- Conflict is a hard block with no override; familiarity warns and proceeds.
create type public.eligibility_flag as enum ('conflict', 'familiarity', 'exposure', 'capability', 'reach');

create table public.audit_offer (
  id            uuid primary key default public.uuid_generate_v7(),
  audit_id      uuid not null references public.audit (id) on delete cascade,
  auditor_id    uuid not null references public.auditor_profile (user_id) on delete restrict,
  outcome       public.assignment_outcome not null default 'offered',
  -- Why this auditor was reachable for this audit, in the words of the rule
  -- that matched. Free text on purpose: the rules are young and will change.
  match_reason  text,
  -- Warnings that did not block, e.g. familiarity. Blocks never reach an offer.
  warnings      public.eligibility_flag[] not null default '{}',
  offered_at    timestamptz not null default now(),
  responded_at  timestamptz,
  expires_at    timestamptz,
  decline_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (audit_id, auditor_id),
  constraint responded_has_timestamp
    check (outcome in ('offered', 'expired') or responded_at is not null)
);

create index audit_offer_auditor_idx on public.audit_offer (auditor_id, outcome);
create index audit_offer_open_idx on public.audit_offer (audit_id) where outcome = 'offered';

-- Exactly one accepted offer per audit.
create unique index audit_offer_one_accepted
  on public.audit_offer (audit_id) where outcome = 'accepted';

alter table public.audit
  -- The client picks a window, never the shift date. The exact pitch is
  -- withheld until an auditor accepts, so it cannot leak through an offer.
  add column window_start_on date,
  add column window_end_on date,
  add column pitch_detail text,
  -- No-show: paid in full, credit returned, never scored.
  add column no_team_present_at timestamptz,
  -- First three audits per auditor are gated for PICK review.
  add column requires_review boolean not null default true,
  add column released_at timestamptz,
  add column released_by uuid references public.user_profile (id),
  add constraint window_ordered check (window_end_on is null or window_start_on is null
                                       or window_end_on >= window_start_on),
  -- The design's pipeline has no 'scheduled' or 'submitted'; they survive in the
  -- type only because Postgres cannot drop an enum value.
  add constraint status_in_pipeline check (
    status in ('draft', 'booked', 'assigned', 'in_progress', 'in_review',
               'released', 'no_team_present', 'cancelled')
  );

-- 1 credit = 1 audit = £175. Auditor pay £100 + travel uplift, always itemised.
alter table public.audit
  alter column auditor_fee_pence set default 10000;

create table public.audit_pay_item (
  id           uuid primary key default public.uuid_generate_v7(),
  audit_id     uuid not null references public.audit (id) on delete cascade,
  kind         text not null,
  amount_pence integer not null,
  note         text,
  created_at   timestamptz not null default now(),
  constraint pay_kind_known check (kind in ('base', 'travel', 'no_show', 'adjustment'))
);

create index audit_pay_item_audit_idx on public.audit_pay_item (audit_id);

create trigger audit_offer_touch before update on public.audit_offer
  for each row execute function app.touch_updated_at();
