-- ---------------------------------------------------------------------------
-- Enumerations. Short, closed lists. Adding a value is a migration, on purpose.
-- ---------------------------------------------------------------------------

create type public.org_type          as enum ('charity', 'contractor', 'pick');
create type public.residency_zone    as enum ('uk', 'eea', 'other');
create type public.app_role          as enum ('auditor', 'client', 'pick_admin');
create type public.user_status       as enum ('invited', 'active', 'suspended');

create type public.auditor_approval_status as enum
  ('pending', 'approved', 'suspended', 'rejected');

create type public.audit_status as enum
  ('draft', 'requested', 'matched', 'scheduled', 'in_progress',
   'submitted', 'under_review', 'completed', 'cancelled');

-- What the auditor sees: the shape of a real doorstep/street interaction.
create type public.audit_moment as enum
  ('approach', 'walk_up', 'opening', 'pitch', 'ask', 'tablet', 'sign_up', 'close');

-- What scoring uses. Never rendered in the field app.
create type public.compliance_category as enum
  ('identification',
   'solicitation_statement',
   'honesty_and_accuracy',
   'vulnerability',
   'pressure_and_persistence',
   'data_protection',
   'consent_and_cancellation',
   'site_conduct',
   'safeguarding',
   'record_keeping');

create type public.check_outcome     as enum ('pass', 'fail', 'not_applicable', 'not_observed');
create type public.observation_kind  as enum ('note', 'timing', 'count', 'incident');
create type public.evidence_kind     as enum ('photo', 'audio', 'video', 'document');

create type public.credit_reason as enum
  ('purchase', 'booking', 'refund', 'adjustment', 'expiry');

create type public.payout_run_status as enum
  ('draft', 'approved', 'executing', 'executed', 'failed', 'cancelled');

-- The rails are swappable; the ledger is not.
create type public.payout_execution_method as enum
  ('manual_csv', 'bank_api', 'stripe_connect');

create type public.payout_line_status as enum ('pending', 'paid', 'failed', 'held');
