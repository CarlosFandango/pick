-- ---------------------------------------------------------------------------
-- Slice 5 — S1.4 Prep.
--
-- An auditor learns the shift as a sequence of moments before they walk it.
-- Progress is per auditor per check: what one person has learnt says nothing
-- about anyone else, and nothing about the audit.
--
-- "Got it" marks a card learnt. "Again" un-marks it. That is the whole model —
-- no scheduling, no intervals, no algorithm. Spaced repetition can come later
-- if the data ever shows people forgetting; today it would be invented need.
-- ---------------------------------------------------------------------------

create table public.prep_progress (
  auditor_id          uuid not null references public.auditor_profile (user_id) on delete cascade,
  check_definition_id uuid not null references public.check_definition (id) on delete cascade,
  learnt_at           timestamptz not null default now(),
  primary key (auditor_id, check_definition_id)
);

alter table public.prep_progress enable row level security;

-- An auditor's prep is their own. PICK can see it (the first three audits are
-- reviewed, and knowing whether someone prepared is part of that); clients
-- never can.
create policy prep_progress_own on public.prep_progress for all to authenticated
  using (auditor_id = auth.uid()) with check (auditor_id = auth.uid());

create policy prep_progress_admin_read on public.prep_progress for select to authenticated
  using (app.is_admin());
