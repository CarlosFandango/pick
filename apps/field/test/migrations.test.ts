import { describe, expect, it } from 'vitest';
import { applyMigrations } from '../src/db/migrate';
import { MIGRATIONS } from '../src/db/schema';
import { FakeDatabase } from './fake-database';

const FAKE = ['create table a (id text);', 'create table b (id text);', 'alter table a add col;'];

describe('applyMigrations', () => {
  it('applies every migration on a fresh device', async () => {
    const db = new FakeDatabase();

    await applyMigrations(db, FAKE);

    expect(db.executed.filter((s) => FAKE.includes(s))).toEqual(FAKE);
    expect(db.userVersion).toBe(FAKE.length);
  });

  it('resumes from where a half-migrated device stopped', async () => {
    const db = new FakeDatabase();
    db.userVersion = 2;

    await applyMigrations(db, FAKE);

    // Re-running the first two would drop or duplicate the auditor's data.
    expect(db.executed.filter((s) => FAKE.includes(s))).toEqual([FAKE[2]]);
    expect(db.userVersion).toBe(3);
  });

  it('does nothing when the device is already up to date', async () => {
    const db = new FakeDatabase();
    db.userVersion = FAKE.length;

    await applyMigrations(db, FAKE);

    expect(db.executed.filter((s) => FAKE.includes(s))).toEqual([]);
    expect(db.userVersion).toBe(FAKE.length);
  });

  it('runs each migration inside its own transaction', async () => {
    const db = new FakeDatabase();

    await applyMigrations(db, FAKE);

    expect(db.transactions).toHaveLength(FAKE.length);
  });

  it('bumps user_version only after the migration has committed', async () => {
    const db = new FakeDatabase();
    let versionDuringFirst: number | null = null;

    await applyMigrations(
      {
        ...db,
        execAsync: async (s: string) => {
          if (s === FAKE[0]) versionDuringFirst = db.userVersion;
          return db.execAsync(s);
        },
        getFirstAsync: db.getFirstAsync.bind(db),
        getAllAsync: db.getAllAsync.bind(db),
        runAsync: db.runAsync.bind(db),
        withTransactionAsync: db.withTransactionAsync.bind(db),
      },
      FAKE,
    );

    // A crash mid-migration must leave the version pointing at the last
    // migration that actually finished, so the retry redoes only that one.
    expect(versionDuringFirst).toBe(0);
    expect(db.userVersion).toBe(FAKE.length);
  });

  it('leaves the version untouched when a migration throws', async () => {
    const db = new FakeDatabase();
    const exploding = ['create table a (id text);', 'this fails'];

    await expect(
      applyMigrations(
        {
          ...db,
          execAsync: async (s: string) => {
            if (s === 'this fails') throw new Error('syntax error');
            return db.execAsync(s);
          },
          getFirstAsync: db.getFirstAsync.bind(db),
          getAllAsync: db.getAllAsync.bind(db),
          runAsync: db.runAsync.bind(db),
          withTransactionAsync: db.withTransactionAsync.bind(db),
        },
        exploding,
      ),
    ).rejects.toThrow('syntax error');

    expect(db.userVersion).toBe(1);
  });
});

describe('the real migration list', () => {
  it('creates the append-only tables the outbox pushes from', async () => {
    const db = new FakeDatabase();

    await applyMigrations(db, MIGRATIONS);

    const sql = db.executed.join('\n');
    for (const table of ['check_result', 'observation_log', 'evidence_attachment']) {
      expect(sql, `missing ${table}`).toContain(`create table if not exists ${table}`);
    }
  });

  it('gives every pushable table a synced_at column, which is the queue', async () => {
    const sql = MIGRATIONS.join('\n');
    for (const table of ['check_result', 'observation_log', 'evidence_attachment']) {
      const body = sql.split(`create table if not exists ${table}`)[1]?.split(');')[0] ?? '';
      expect(body, `${table} has no synced_at`).toContain('synced_at');
    }
  });

  it('never sends compliance_category to the device', async () => {
    // An auditor who knows a question is "the vulnerability one" answers it
    // differently. The category must not exist locally at all.
    expect(MIGRATIONS.join('\n')).not.toContain('compliance_category');
  });
});
