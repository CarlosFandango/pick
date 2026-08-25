/**
 * Local SQLite schema for the field app.
 *
 * Two kinds of table:
 *   cached_*  read-only copies of server data, safe to drop and refetch
 *   the rest  field events the auditor created, which exist nowhere else until
 *             they sync — so they are the source of truth and must survive
 *
 * There is no separate outbox. A field event with `synced_at is null` *is* the
 * queue. One table, one truth, nothing to reconcile.
 */
export const MIGRATIONS: string[] = [
  // v1 — initial
  `
  create table if not exists cached_audit (
    id text primary key,
    reference text not null,
    status text not null,
    site_name text,
    address_line text,
    postcode text not null,
    scheduled_for text,
    check_set_version integer not null default 1,
    fetched_at text not null
  );

  create table if not exists cached_check_definition (
    id text primary key,
    code text not null,
    version integer not null,
    moment text not null,
    prompt text not null,
    guidance text,
    sort_order integer not null default 0
  );

  create table if not exists check_result (
    id text primary key,
    audit_id text not null,
    check_definition_id text not null,
    auditor_id text not null,
    outcome text not null,
    note text,
    occurred_at text not null,
    synced_at text
  );

  create table if not exists observation_log (
    id text primary key,
    audit_id text not null,
    auditor_id text not null,
    kind text not null default 'note',
    moment text,
    body text,
    payload text not null default '{}',
    occurred_at text not null,
    synced_at text
  );

  create table if not exists evidence_attachment (
    id text primary key,
    audit_id text not null,
    observation_log_id text,
    kind text not null,
    storage_bucket text not null,
    storage_path text not null,
    mime_type text,
    byte_size integer,
    duration_seconds integer,
    sha256 text,
    captured_at text,
    synced_at text
  );

  create index if not exists check_result_pending on check_result (synced_at) where synced_at is null;
  create index if not exists observation_log_pending on observation_log (synced_at) where synced_at is null;
  create index if not exists evidence_pending on evidence_attachment (synced_at) where synced_at is null;
  `,
];

/**
 * NOTE: the compliance_category of a check is deliberately absent from this
 * schema. The device never receives it. An auditor who knows a question is
 * "the vulnerability one" answers it differently.
 */
