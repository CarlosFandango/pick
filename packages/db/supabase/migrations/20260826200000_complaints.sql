-- ---------------------------------------------------------------------------
-- S3.6 — the complaint fork.
--
-- Two different things arrive through the same door and must not be conflated:
--
--   about_audit      — the audit itself is wrong. PICK's problem: a disputed
--                      finding, a report that misreads the shift.
--   about_fundraiser — the fundraiser did something wrong. The charity's
--                      problem, and possibly the regulator's. PICK records it
--                      and hands it over; we are not the complaints body.
--
-- Routing them the same way would either bury a regulatory matter in a quality
-- queue, or turn a disagreement about scoring into a safeguarding report.
-- ---------------------------------------------------------------------------

create type public.complaint_subject as enum ('about_audit', 'about_fundraiser');
create type public.complaint_status as enum ('open', 'acknowledged', 'resolved', 'withdrawn');

create table public.complaint (
  id              uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisation (id) on delete restrict,
  audit_id        uuid references public.audit (id) on delete set null,
  subject         public.complaint_subject not null,
  status          public.complaint_status not null default 'open',
  body            text not null,
  raised_by       uuid not null references public.user_profile (id) on delete restrict,
  raised_at       timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at     timestamptz,
  resolution      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint body_not_empty check (length(trim(body)) > 0),
  -- A complaint about an audit has to say which audit.
  constraint audit_complaint_names_the_audit
    check (subject <> 'about_audit' or audit_id is not null)
);

create index complaint_org_idx on public.complaint (organisation_id, status);
create index complaint_open_idx on public.complaint (status) where status = 'open';

alter table public.complaint enable row level security;

create policy complaint_read on public.complaint for select to authenticated
  using (app.is_admin() or organisation_id = app.current_org());

create policy complaint_raise on public.complaint for insert to authenticated
  with check (organisation_id = app.current_org() and raised_by = auth.uid());

-- Only PICK moves a complaint along. A charity can raise one and read it;
-- marking their own complaint resolved would make the record meaningless.
create policy complaint_admin_write on public.complaint for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

create trigger complaint_touch before update on public.complaint
  for each row execute function app.touch_updated_at();
