import { type FlagSeverity, newId } from '@picksel/core';
import type { LocalDatabase } from '@/db/types';

/**
 * Field events, written locally first.
 *
 * Every row gets its id here, on the device, before it exists anywhere. That
 * is what makes sync idempotent: re-sending a batch is `on conflict do
 * nothing`, and there is no server-side dedup to get wrong.
 *
 * `occurred_at` is the device clock — when it happened. `recorded_at` is the
 * server's, added on arrival. They are never reconciled: an audit that syncs
 * three days late is a fact worth keeping.
 *
 * Nothing here needs a network. An auditor works a full shift underground and
 * the rows wait with `synced_at is null`, which IS the queue.
 */
export interface EventContext {
  db: LocalDatabase;
  auditId: string;
  auditorId: string;
}

async function insertObservation(
  { db, auditId, auditorId }: EventContext,
  row: {
    kind: string;
    stageKey?: string | null;
    moment?: string | null;
    body?: string | null;
    severity?: FlagSeverity | null;
  },
  occurredAt: Date,
): Promise<string> {
  const id = newId();
  await db.runAsync(
    `insert into observation_log
       (id, audit_id, auditor_id, kind, stage_key, moment, body, occurred_at)
     values (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      auditId,
      auditorId,
      row.kind,
      row.stageKey ?? null,
      row.moment ?? null,
      row.body ?? null,
      occurredAt.toISOString(),
    ],
  );
  return id;
}

/** Entering a stage. The timestamp is what an observation phase is scored on. */
export function recordStageEntry(context: EventContext, stageKey: string, at: Date) {
  return insertObservation(context, { kind: 'timing', stageKey, body: 'entered' }, at);
}

export function recordSessionEnd(context: EventContext, stageKey: string, at: Date) {
  return insertObservation(context, { kind: 'timing', stageKey, body: 'ended' }, at);
}

/** One tap on a counter during an observation stage. */
export function recordTally(context: EventContext, stageKey: string, counterKey: string, at: Date) {
  return insertObservation(context, { kind: 'count', stageKey, body: counterKey }, at);
}

/** A flag. The one thing an auditor can record mid-interaction. */
export function recordMarker(
  context: EventContext,
  stageKey: string,
  severity: FlagSeverity,
  at: Date,
) {
  return insertObservation(context, { kind: 'incident', stageKey, body: severity }, at);
}
