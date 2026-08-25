-- ---------------------------------------------------------------------------
-- Identity: organisations, user profiles, auditor profiles + coverage.
-- One auth system (auth.users); role lives on user_profile.
-- ---------------------------------------------------------------------------

create table public.organisation (
  id                     uuid primary key default public.uuid_generate_v7(),
  name                   text not null,
  org_type               public.org_type not null,
  -- Day-one field. Determines where this org's data may be stored/processed.
  residency_zone         public.residency_zone not null default 'uk',
  charity_number         text,
  companies_house_number text,
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index organisation_org_type_idx on public.organisation (org_type)
  where is_active;

create table public.user_profile (
  id              uuid primary key references auth.users (id) on delete cascade,
  organisation_id uuid references public.organisation (id) on delete restrict,
  role            public.app_role not null,
  full_name       text not null,
  email           text not null,
  phone           text,
  status          public.user_status not null default 'invited',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- A client always belongs to the charity they act for.
  constraint client_requires_org check (role <> 'client' or organisation_id is not null)
);

create unique index user_profile_email_key on public.user_profile (lower(email));
create index user_profile_org_idx on public.user_profile (organisation_id);

create table public.auditor_profile (
  user_id                  uuid primary key
                             references public.user_profile (id) on delete cascade,
  approval_status          public.auditor_approval_status not null default 'pending',
  approved_at              timestamptz,
  approved_by              uuid references public.user_profile (id),
  right_to_work_checked_on date,
  dbs_checked_on           date,
  -- Opaque pointer into whichever payout rail is current. Never bank details.
  payout_reference         text,
  base_postcode            text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint approved_has_timestamp
    check (approval_status <> 'approved' or approved_at is not null)
);

-- Postcode matching, v1: outward-code area letters ('SW', 'M', 'EH').
-- Deliberately coarse. Districts/radii can be added when demand shows a need.
create table public.auditor_coverage (
  id           uuid primary key default public.uuid_generate_v7(),
  auditor_id   uuid not null
                 references public.auditor_profile (user_id) on delete cascade,
  postcode_area text not null,
  created_at   timestamptz not null default now(),
  unique (auditor_id, postcode_area),
  constraint postcode_area_format check (postcode_area ~ '^[A-Z]{1,2}$')
);

create index auditor_coverage_area_idx on public.auditor_coverage (postcode_area);

create trigger organisation_touch before update on public.organisation
  for each row execute function app.touch_updated_at();
create trigger user_profile_touch before update on public.user_profile
  for each row execute function app.touch_updated_at();
create trigger auditor_profile_touch before update on public.auditor_profile
  for each row execute function app.touch_updated_at();
