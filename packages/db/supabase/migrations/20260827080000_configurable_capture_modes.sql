-- ---------------------------------------------------------------------------
-- Stages become configuration (TND-83).
--
-- There are two stages — observation and interaction — and until now both the
-- list and the behaviour it drove were code. `capture_mode` was a Postgres
-- enum, and `permissions()` in core was a switch over its two values deciding
-- what an auditor was allowed to do. Adding a third stage meant a migration,
-- an enum value, a switch arm and a deploy.
--
-- After this it is a row. The behaviour travels with it as three flags, so the
-- rule "an interaction stage exposes no tally counter" stops being a branch in
-- TypeScript and becomes a `false` in a column.
--
-- The flags live on the stage rather than on the 36 template rows that
-- reference it. One place per fact: the constraint belongs to the stage, and
-- copying it per step would mean 36 chances to disagree with itself.
-- ---------------------------------------------------------------------------

create table public.audit_capture_mode (
  key            text primary key,
  label          text not null,
  sort_order     integer not null,

  -- What an auditor may physically do while in this stage. Discretion is the
  -- whole reason these differ: a bystander can hold a phone, someone being
  -- pitched to cannot.
  allows_tallies boolean not null default false,
  allows_notes   boolean not null default false,
  -- A single discreet marker is possible in any stage — it is one tap and
  -- needs no reading. Defaulted true because a stage that captures nothing at
  -- all would be a stage with no purpose.
  allows_markers boolean not null default true,

  -- Guidance shown to whoever edits this in the admin screen. Flipping
  -- `allows_tallies` on an interaction stage is a decision about whether the
  -- audit still measures what it claims to, and the person making it should be
  -- told why before they do.
  caution        text,

  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint capture_mode_key_lower check (key ~ '^[a-z][a-z0-9_]*$')
);

create trigger audit_capture_mode_touch before update on public.audit_capture_mode
  for each row execute function app.touch_updated_at();

-- The two current stages, with the behaviour that was previously in code.
insert into public.audit_capture_mode
  (key, label, sort_order, allows_tallies, allows_notes, allows_markers, caution)
values
  ('observation', 'Observation', 1, true, true, true, null),
  ('interaction', 'Interaction', 2, false, false, true,
   'The auditor is being pitched to during this stage. A fundraiser who sees them tallying or typing stops behaving normally, and the audit stops measuring what it claims to.');

-- ---------------------------------------------------------------------------
-- Convert the template column from enum to a foreign key.
--
-- The column keeps its name, so every query that already selects
-- `capture_mode` keeps working — the change is what the value means, not what
-- it is called. Renaming it would be a second, unrelated change riding along
-- with this one.
-- ---------------------------------------------------------------------------

alter table public.audit_stage_template add column capture_mode_key text;

update public.audit_stage_template set capture_mode_key = capture_mode::text;

alter table public.audit_stage_template alter column capture_mode_key set not null;

alter table public.audit_stage_template drop column capture_mode;

alter table public.audit_stage_template rename column capture_mode_key to capture_mode;

alter table public.audit_stage_template
  add constraint audit_stage_template_capture_mode_fkey
  foreign key (capture_mode) references public.audit_capture_mode (key);

drop type public.capture_mode;

-- ---------------------------------------------------------------------------
-- Same access as the stage list it belongs to: every signed-in user reads it,
-- only PICK admin writes it.
-- ---------------------------------------------------------------------------
alter table public.audit_capture_mode enable row level security;

grant select on public.audit_capture_mode to authenticated;
grant insert, update, delete on public.audit_capture_mode to authenticated;

create policy audit_capture_mode_read on public.audit_capture_mode
  for select to authenticated using (true);

create policy audit_capture_mode_admin_write on public.audit_capture_mode
  for all to authenticated using (app.is_admin()) with check (app.is_admin());
