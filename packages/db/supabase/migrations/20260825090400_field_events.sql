-- ---------------------------------------------------------------------------
-- Field events. Append-only, device-minted ids, dual timestamps.
--
--   id           UUIDv7 generated on the device -> re-sending a row is a no-op
--                (insert ... on conflict do nothing). Idempotent sync, no
--                server-side dedup logic.
--   occurred_at  device clock, when it happened in the field
--   recorded_at  server clock, when it reached us. Never equal, never merged.
--
-- Corrections are new rows. "Current" = latest occurred_at for the key.
-- ---------------------------------------------------------------------------

create table public.observation_log (
  id          uuid primary key,
  audit_id    uuid not null references public.audit (id) on delete restrict,
  auditor_id  uuid not null references public.auditor_profile (user_id) on delete restrict,
  kind        public.observation_kind not null default 'note',
  moment      public.audit_moment,
  body        text,
  -- Capture-only. Nothing reads this yet; it exists so the field app can record
  -- structure we have not decided how to use. Do not build queries against it
  -- until a real requirement lands.
  payload     jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index observation_log_audit_idx on public.observation_log (audit_id, occurred_at);

create table public.check_result (
  id                  uuid primary key,
  audit_id            uuid not null references public.audit (id) on delete restrict,
  check_definition_id uuid not null references public.check_definition (id) on delete restrict,
  auditor_id          uuid not null references public.auditor_profile (user_id) on delete restrict,
  outcome             public.check_outcome not null,
  note                text,
  occurred_at         timestamptz not null,
  recorded_at         timestamptz not null default now()
);

create index check_result_latest_idx
  on public.check_result (audit_id, check_definition_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- EvidenceAttachment: a pointer, nothing more. No upload, transcode or
-- playback code exists or should be written until A/V is actually scheduled.
-- ---------------------------------------------------------------------------
create table public.evidence_attachment (
  id                 uuid primary key,
  audit_id           uuid not null references public.audit (id) on delete restrict,
  observation_log_id uuid references public.observation_log (id) on delete restrict,
  kind               public.evidence_kind not null,
  storage_bucket     text not null,
  storage_path       text not null,
  mime_type          text,
  byte_size          bigint,
  duration_seconds   integer,
  sha256             text,
  captured_at        timestamptz,
  recorded_at        timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index evidence_attachment_audit_idx on public.evidence_attachment (audit_id);
