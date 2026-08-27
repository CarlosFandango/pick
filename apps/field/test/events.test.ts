import { isUuidV7 } from '@picksel/core';
import { describe, expect, it } from 'vitest';
import {
  type EventContext,
  recordMarker,
  recordSessionEnd,
  recordStageEntry,
  recordTally,
} from '../src/lib/events';
import { FakeDatabase } from './fake-database';

const AT = new Date(2026, 2, 3, 11, 38, 0);

function context(): EventContext & { db: FakeDatabase } {
  const db = new FakeDatabase({ observation_log: [] });
  return { db, auditId: 'a1', auditorId: 'auditor-1' };
}

describe('field events written on the device', () => {
  it('mints its own id, which is what makes sync idempotent', async () => {
    // Re-sending a batch is `on conflict do nothing`. There is no server-side
    // dedup to get wrong, because the id existed before the row did.
    const { db, ...rest } = context();
    const id = await recordStageEntry({ db, ...rest }, 'arrival', AT);

    expect(isUuidV7(id)).toBe(true);
  });

  it('stamps the device clock, not the server', async () => {
    // occurred_at is when it happened. recorded_at is when we heard about it,
    // added on arrival. An audit that syncs three days late keeps both.
    const { db, ...rest } = context();
    await recordStageEntry({ db, ...rest }, 'arrival', AT);

    const [statement, params] = db.statements.at(-1) as [string, unknown[]];
    expect(statement).toContain('insert into observation_log');
    expect(params).toContain(AT.toISOString());
    expect(statement).not.toContain('recorded_at');
  });

  it('leaves the row queued, because synced_at is null IS the outbox', async () => {
    const { db, ...rest } = context();
    await recordTally({ db, ...rest }, 'team_observation', 'stops', AT);

    const [statement] = db.statements.at(-1) as [string, unknown[]];
    expect(statement).not.toContain('synced_at');
  });

  it('records which stage each kind of event belongs to', async () => {
    const { db, ...rest } = context();
    const ctx = { db, ...rest };

    await recordStageEntry(ctx, 'arrival', AT);
    await recordTally(ctx, 'team_observation', 'stops', AT);
    await recordMarker(ctx, 'pitch', 'wrong', AT);
    await recordSessionEnd(ctx, 'close', AT);

    const kinds = db.statements.map(([, params]) => (params as string[])[3]);
    const stages = db.statements.map(([, params]) => (params as string[])[4]);

    expect(kinds).toEqual(['timing', 'count', 'incident', 'timing']);
    expect(stages).toEqual(['arrival', 'team_observation', 'pitch', 'close']);
  });

  it('never writes a compliance category', async () => {
    // The category is absent from the device entirely. An auditor who knows a
    // question is "the vulnerability one" answers it differently.
    const { db, ...rest } = context();
    await recordMarker({ db, ...rest }, 'pitch', 'note', AT);

    expect(db.statements.map(([sql]) => sql).join('\n')).not.toContain('category');
  });
});
