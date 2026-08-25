import type { Database, Insert } from '@picksel/api';
import { pushBatch } from '@picksel/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SQLiteDatabase } from 'expo-sqlite';

/** Tables the device pushes upward. Nothing here is ever pulled back down. */
const PUSH_TABLES = ['check_result', 'observation_log', 'evidence_attachment'] as const;
type PushTable = (typeof PUSH_TABLES)[number];

const BATCH_SIZE = 100;

export interface SyncOutcome {
  pushed: Record<PushTable, number>;
  failed: PushTable[];
}

/**
 * Push everything the device has not yet acknowledged.
 *
 * Safe to call at any time, including over a connection that dies mid-batch.
 * Row ids are minted on the device, so a re-sent batch is a no-op server-side;
 * the worst case is that we push the same rows twice and mark them once.
 *
 * A failure on one table does not stop the others — an auditor with a broken
 * photo upload should still get their checks in.
 */
export async function flushOutbox(
  local: SQLiteDatabase,
  remote: SupabaseClient<Database>,
): Promise<SyncOutcome> {
  const pushed: Record<PushTable, number> = {
    check_result: 0,
    observation_log: 0,
    evidence_attachment: 0,
  };
  const failed: PushTable[] = [];

  for (const table of PUSH_TABLES) {
    try {
      pushed[table] = await flushTable(local, remote, table);
    } catch {
      failed.push(table);
    }
  }

  return { pushed, failed };
}

async function flushTable(
  local: SQLiteDatabase,
  remote: SupabaseClient<Database>,
  table: PushTable,
): Promise<number> {
  let total = 0;

  for (;;) {
    const rows = await local.getAllAsync<Record<string, unknown>>(
      `select * from ${table} where synced_at is null order by occurred_at limit ?`,
      [BATCH_SIZE],
    );
    if (rows.length === 0) return total;

    await pushBatch(
      remote,
      table,
      rows.map((row) => toInsert(table, row)),
    );

    const ids = rows.map((row) => String(row.id));
    const placeholders = ids.map(() => '?').join(',');
    await local.runAsync(`update ${table} set synced_at = ? where id in (${placeholders})`, [
      new Date().toISOString(),
      ...ids,
    ]);

    total += rows.length;
    if (rows.length < BATCH_SIZE) return total;
  }
}

/**
 * SQLite has no JSON or boolean type, and `synced_at` is ours alone — the
 * server has `recorded_at` for when it heard about the row.
 */
function toInsert<T extends PushTable>(table: T, row: Record<string, unknown>): Insert<T> {
  const { synced_at: _synced, ...rest } = row;

  if (table === 'observation_log' && typeof rest.payload === 'string') {
    rest.payload = JSON.parse(rest.payload);
  }

  return rest as Insert<T>;
}
