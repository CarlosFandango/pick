import type { BindValue, LocalDatabase } from '../src/db/types';

interface Row {
  [column: string]: unknown;
}

/**
 * An in-memory stand-in for the handful of SQLite calls this app makes.
 *
 * Not a SQL engine: it recognises the specific shapes the app issues and
 * records everything else for assertions. A real engine would test SQLite
 * rather than our logic, and would need the Expo runtime to be honest.
 */
export class FakeDatabase implements LocalDatabase {
  userVersion = 0;
  readonly tables = new Map<string, Row[]>();
  readonly executed: string[] = [];
  readonly transactions: number[] = [];
  /** Tables that should throw on read, to simulate a failing push. */
  failOn = new Set<string>();

  constructor(seed: Record<string, Row[]> = {}) {
    for (const [table, rows] of Object.entries(seed)) {
      this.tables.set(
        table,
        rows.map((r) => ({ ...r })),
      );
    }
  }

  async execAsync(source: string): Promise<void> {
    this.executed.push(source);
    const bump = source.match(/pragma user_version = (\d+)/);
    if (bump?.[1]) this.userVersion = Number(bump[1]);
  }

  async getFirstAsync<T>(source: string, _params: BindValue[] = []): Promise<T | null> {
    if (source.includes('user_version')) {
      return { user_version: this.userVersion } as T;
    }
    return null;
  }

  async getAllAsync<T>(source: string, params: BindValue[] = []): Promise<T[]> {
    const table = source.match(/from (\w+)/)?.[1];
    if (!table) throw new Error(`unrecognised query: ${source}`);
    if (this.failOn.has(table)) throw new Error(`simulated read failure on ${table}`);

    const limit = typeof params[0] === 'number' ? params[0] : Number.POSITIVE_INFINITY;
    const rows = (this.tables.get(table) ?? [])
      .filter((r) => (source.includes('synced_at is null') ? r.synced_at == null : true))
      .sort((a, b) => String(a.occurred_at).localeCompare(String(b.occurred_at)))
      .slice(0, limit);

    return rows.map((r) => ({ ...r })) as T[];
  }

  async runAsync(source: string, params: BindValue[] = []): Promise<unknown> {
    const table = source.match(/update (\w+)/)?.[1];
    if (!table) throw new Error(`unrecognised statement: ${source}`);

    const [syncedAt, ...ids] = params;
    for (const row of this.tables.get(table) ?? []) {
      if (ids.some((id) => id === row.id)) row.synced_at = syncedAt;
    }
    return { changes: ids.length };
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    this.transactions.push(this.executed.length);
    await task();
  }

  rows(table: string): Row[] {
    return this.tables.get(table) ?? [];
  }

  pending(table: string): Row[] {
    return this.rows(table).filter((r) => r.synced_at == null);
  }
}

/** Records what was pushed, and can be told to fail for a given table. */
export function fakeRemote() {
  const pushed: { table: string; rows: Record<string, unknown>[] }[] = [];
  const failing = new Set<string>();

  const client = {
    from(table: string) {
      return {
        upsert(rows: Record<string, unknown>[]) {
          if (failing.has(table)) {
            return Promise.resolve({ error: new Error(`simulated push failure: ${table}`) });
          }
          pushed.push({ table, rows });
          return Promise.resolve({ error: null });
        },
      };
    },
  };

  return { client, pushed, failing };
}
