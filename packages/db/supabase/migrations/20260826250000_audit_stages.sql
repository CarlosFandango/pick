-- ---------------------------------------------------------------------------
-- An audit is two phases, not one (TND-78, TND-83).
--
-- Roughly 45 minutes observing the team from a distance, then a 15 minute
-- mystery shop as a participant. The moment sequence already modelled — walk-up,
-- opening, pitch, ask — describes the *second* of those. You cannot tally a
-- stop rate on a form organised as one customer journey.
--
-- The consequence that drives the design: **the discretion constraint is not
-- uniform.** A bystander can hold a phone. Someone being pitched to cannot.
-- So each stage declares its own capture mode, and the field app reads that
-- rather than assuming.
--
-- Stages are data, seeded per audit type, because the sequence is Jaz's to set
-- and it is not settled — the spec asks for it to be confirmed by walkthrough.
-- Seeding it means his answer is a seed change, not a code change.
--
-- Checks are not given a stage column. A check already carries a moment, and a
-- stage already carries the moment it covers, so a check resolves to a stage
-- through the moment it already has. One place per fact.
-- ---------------------------------------------------------------------------

create type public.capture_mode as enum ('observation', 'interaction');

create table public.audit_stage_template (
  id                    uuid primary key default public.uuid_generate_v7(),
  audit_type            public.audit_type not null,
  version               integer not null default 1,
  sequence              integer not null,
  key                   text not null,
  label                 text not null,
  capture_mode          public.capture_mode not null,
  -- Which moment's checks belong to this stage. Null on an observation stage
  -- that gathers counts rather than answering checks.
  moment                public.audit_moment,
  duration_hint_minutes integer,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint stage_sequence_positive check (sequence > 0),
  constraint stage_key_lower check (key ~ '^[a-z][a-z0-9_]*$'),
  constraint stage_duration_positive check (duration_hint_minutes is null or duration_hint_minutes > 0)
);

create unique index audit_stage_template_sequence_idx
  on public.audit_stage_template (audit_type, version, sequence);
create unique index audit_stage_template_key_idx
  on public.audit_stage_template (audit_type, version, key);
-- A moment belongs to at most one stage, which is what makes "resolve a check
-- to a stage through its moment" a lookup rather than a choice.
create unique index audit_stage_template_moment_idx
  on public.audit_stage_template (audit_type, version, moment) where moment is not null;

create trigger audit_stage_template_touch before update on public.audit_stage_template
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Stage entry and exit are field events, not a new table.
--
-- `observation_log` already exists, is already append-only, already syncs
-- through the outbox and already carries `kind = 'timing'` for exactly this.
-- What it lacked was somewhere to say *which stage* — a stage is not always a
-- moment, so `moment` could not carry it.
--
-- `kind = 'count'` carries a tally, `kind = 'incident'` a marker. Both already
-- exist in the enum.
-- ---------------------------------------------------------------------------
alter table public.observation_log add column stage_key text;

create index observation_log_stage_idx
  on public.observation_log (audit_id, stage_key) where stage_key is not null;

-- ---------------------------------------------------------------------------
-- Which catalogue of stages an audit was run under. Same argument as
-- check_set_version: a stage list that changed underneath a completed audit
-- would make its timings mean something different in hindsight.
-- ---------------------------------------------------------------------------
alter table public.audit add column stage_set_version integer not null default 1;

-- ---------------------------------------------------------------------------
-- The default sequence, seeded for every audit type.
--
-- Identical across types today. That is not an assumption they stay identical —
-- it is the starting point, and differentiating one is an insert, not a change
-- to any code. Stages 3-9 are the mystery shop.
-- ---------------------------------------------------------------------------
insert into public.audit_stage_template
  (audit_type, sequence, key, label, capture_mode, moment, duration_hint_minutes)
select
  t.audit_type,
  s.sequence,
  s.key,
  s.label,
  s.capture_mode::public.capture_mode,
  s.moment::public.audit_moment,
  s.duration_hint_minutes
from
  (values
    ('street'::public.audit_type),
    ('door_to_door'::public.audit_type),
    ('private_site'::public.audit_type),
    ('lottery'::public.audit_type)
  ) as t (audit_type),
  (values
    (1, 'arrival',          'Arrival and setup',     'observation', null,       null),
    (2, 'team_observation', 'Team observation',      'observation', 'approach', 45),
    (3, 'walk_up',          'Walk-up',               'interaction', 'walk_up',  null),
    (4, 'opening',          'Opening',               'interaction', 'opening',  null),
    (5, 'pitch',            'Pitch',                 'interaction', 'pitch',    null),
    (6, 'ask',              'The ask',               'interaction', 'ask',      null),
    (7, 'tablet',           'Tablet and transaction','interaction', 'tablet',   null),
    (8, 'sign_up',          'Sign-up',               'interaction', 'sign_up',  null),
    (9, 'close',            'Close and exit',        'interaction', 'close',    null)
  ) as s (sequence, key, label, capture_mode, moment, duration_hint_minutes);

-- ---------------------------------------------------------------------------
-- The stage list is not secret and every signed-in user needs it: the auditor
-- to run the audit, the client to read a report organised by it.
-- ---------------------------------------------------------------------------
alter table public.audit_stage_template enable row level security;

grant select on public.audit_stage_template to authenticated;
grant insert, update, delete on public.audit_stage_template to authenticated;

create policy audit_stage_template_read on public.audit_stage_template
  for select to authenticated using (true);

create policy audit_stage_template_admin_write on public.audit_stage_template
  for all to authenticated using (app.is_admin()) with check (app.is_admin());
