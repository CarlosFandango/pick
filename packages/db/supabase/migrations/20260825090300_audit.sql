-- ---------------------------------------------------------------------------
-- Audits and the check catalogue.
-- ---------------------------------------------------------------------------

create sequence public.audit_reference_seq start 1000;

create table public.audit (
  id                     uuid primary key default public.uuid_generate_v7(),
  reference              text not null unique
                           default 'PS-' || lpad(nextval('public.audit_reference_seq')::text, 6, '0'),
  client_organisation_id uuid not null references public.organisation (id) on delete restrict,
  auditor_id             uuid references public.auditor_profile (user_id) on delete restrict,
  status                 public.audit_status not null default 'draft',

  campaign_name          text,
  site_name              text,
  address_line           text,
  postcode               text not null,
  -- Derived once, indexed, used for matching. No parsing logic in app code.
  postcode_outward       text generated always as (
                           upper(left(replace(postcode, ' ', ''),
                                      greatest(length(replace(postcode, ' ', '')) - 3, 0)))
                         ) stored,
  postcode_area          text generated always as (
                           upper(substring(replace(postcode, ' ', '') from '^[A-Za-z]{1,2}'))
                         ) stored,

  scheduled_for          timestamptz,
  window_minutes         integer,

  price_pence            integer not null default 17500,
  auditor_fee_pence      integer,
  -- Pins the audit to the check catalogue version it was scored against.
  check_set_version      integer not null default 1,

  requested_at           timestamptz,
  matched_at             timestamptz,
  started_at             timestamptz,
  submitted_at           timestamptz,
  completed_at           timestamptz,
  cancelled_at           timestamptz,
  cancellation_reason    text,

  created_by             uuid references public.user_profile (id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint postcode_format
    check (postcode ~* '^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}$'),
  constraint assigned_when_matched
    check (status in ('draft', 'requested', 'cancelled') or auditor_id is not null)
);

create index audit_client_idx    on public.audit (client_organisation_id, status);
create index audit_auditor_idx   on public.audit (auditor_id, status);
create index audit_matching_idx  on public.audit (postcode_area, status)
  where status = 'requested';
create index audit_scheduled_idx on public.audit (scheduled_for);

create trigger audit_touch before update on public.audit
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- CheckDefinition: the catalogue. Two homes per check.
--   moment              -> what the auditor sees and works through
--   compliance_category -> what scoring aggregates over
-- Rows are immutable in practice: changing a check means a new version, so
-- historical CheckResults keep pointing at exactly what was asked.
-- ---------------------------------------------------------------------------
create table public.check_definition (
  id                  uuid primary key default public.uuid_generate_v7(),
  code                text not null,
  version             integer not null default 1,
  moment              public.audit_moment not null,
  compliance_category public.compliance_category not null,
  -- Auditor-facing. Must not name or hint at the compliance category.
  prompt              text not null,
  guidance            text,
  weight              integer not null default 1,
  is_critical         boolean not null default false,
  sort_order          integer not null default 0,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  unique (code, version),
  constraint weight_positive check (weight > 0)
);

create index check_definition_moment_idx
  on public.check_definition (version, moment, sort_order) where is_active;
