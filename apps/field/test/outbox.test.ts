import { describe, expect, it } from 'vitest';
import { flushOutbox } from '../src/sync/outbox';
import { FakeDatabase, fakeRemote } from './fake-database';

// biome-ignore lint/suspicious/noExplicitAny: the double implements only what flushOutbox calls
const asRemote = (c: unknown) => c as any;

function checkRow(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    audit_id: 'audit-1',
    check_definition_id: 'check-1',
    auditor_id: 'auditor-1',
    outcome: 'pass',
    note: null,
    occurred_at: `2026-08-25T10:00:${id.padStart(2, '0')}.000Z`,
    synced_at: null,
    ...over,
  };
}

describe('flushOutbox', () => {
  it('does nothing when there is nothing to send', async () => {
    const local = new FakeDatabase({
      check_result: [],
      observation_log: [],
      evidence_attachment: [],
    });
    const remote = fakeRemote();

    const result = await flushOutbox(local, asRemote(remote.client));

    expect(result.pushed.check_result).toBe(0);
    expect(remote.pushed).toHaveLength(0);
  });

  it('sends unsynced rows and marks them synced', async () => {
    const local = new FakeDatabase({ check_result: [checkRow('1'), checkRow('2')] });
    const remote = fakeRemote();

    const result = await flushOutbox(local, asRemote(remote.client));

    expect(result.pushed.check_result).toBe(2);
    expect(local.pending('check_result')).toHaveLength(0);
  });

  it('leaves already-synced rows alone', async () => {
    const local = new FakeDatabase({
      check_result: [checkRow('1', { synced_at: '2026-08-25T09:00:00.000Z' }), checkRow('2')],
    });
    const remote = fakeRemote();

    await flushOutbox(local, asRemote(remote.client));

    // Only the unsynced row is re-sent; the synced one is not touched again.
    expect(remote.pushed[0]?.rows.map((r) => r.id)).toEqual(['2']);
  });

  it("strips synced_at, which is the device's own bookkeeping", async () => {
    const local = new FakeDatabase({ check_result: [checkRow('1')] });
    const remote = fakeRemote();

    await flushOutbox(local, asRemote(remote.client));

    // The server has recorded_at for when it heard about the row.
    expect(remote.pushed[0]?.rows[0]).not.toHaveProperty('synced_at');
    expect(remote.pushed[0]?.rows[0]).toHaveProperty('occurred_at');
  });

  it('parses the observation payload, which SQLite can only store as text', async () => {
    const local = new FakeDatabase({
      observation_log: [
        {
          id: 'o1',
          audit_id: 'audit-1',
          auditor_id: 'auditor-1',
          kind: 'note',
          moment: 'ask',
          body: 'stepped back when asked',
          payload: '{"seconds":12}',
          occurred_at: '2026-08-25T10:00:00.000Z',
          synced_at: null,
        },
      ],
    });
    const remote = fakeRemote();

    await flushOutbox(local, asRemote(remote.client));

    expect(remote.pushed[0]?.rows[0]?.payload).toEqual({ seconds: 12 });
  });

  it('sends more than one batch when there is a backlog', async () => {
    // A full day of audits offline is well over one batch.
    const rows = Array.from({ length: 250 }, (_, i) => checkRow(String(i + 1)));
    const local = new FakeDatabase({ check_result: rows });
    const remote = fakeRemote();

    const result = await flushOutbox(local, asRemote(remote.client));

    expect(result.pushed.check_result).toBe(250);
    expect(remote.pushed.length).toBeGreaterThan(1);
    expect(local.pending('check_result')).toHaveLength(0);
  });

  it('keeps rows pending when the push fails, so nothing is lost', async () => {
    const local = new FakeDatabase({ check_result: [checkRow('1')] });
    const remote = fakeRemote();
    remote.failing.add('check_result');

    const result = await flushOutbox(local, asRemote(remote.client));

    expect(result.failed).toContain('check_result');
    expect(result.pushed.check_result).toBe(0);
    expect(local.pending('check_result')).toHaveLength(1);
  });

  it('gets the checks in even when the evidence upload is broken', async () => {
    const local = new FakeDatabase({
      check_result: [checkRow('1')],
      evidence_attachment: [
        {
          id: 'e1',
          audit_id: 'audit-1',
          kind: 'photo',
          storage_bucket: 'evidence',
          storage_path: 'a.jpg',
          occurred_at: '2026-08-25T10:00:00.000Z',
          synced_at: null,
        },
      ],
    });
    const remote = fakeRemote();
    remote.failing.add('evidence_attachment');

    const result = await flushOutbox(local, asRemote(remote.client));

    expect(result.failed).toEqual(['evidence_attachment']);
    expect(result.pushed.check_result).toBe(1);
    expect(local.pending('check_result')).toHaveLength(0);
  });

  it('survives a read failure on one table', async () => {
    const local = new FakeDatabase({ check_result: [checkRow('1')], observation_log: [] });
    local.failOn.add('observation_log');
    const remote = fakeRemote();

    const result = await flushOutbox(local, asRemote(remote.client));

    expect(result.failed).toContain('observation_log');
    expect(result.pushed.check_result).toBe(1);
  });

  it('is safe to run twice — the second pass finds nothing', async () => {
    const local = new FakeDatabase({ check_result: [checkRow('1')] });
    const remote = fakeRemote();

    await flushOutbox(local, asRemote(remote.client));
    const second = await flushOutbox(local, asRemote(remote.client));

    expect(second.pushed.check_result).toBe(0);
    expect(remote.pushed).toHaveLength(1);
  });
});
