import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

type Db = Awaited<Parameters<Parameters<typeof withDatabase>[0]>[0]>;

const AUDIT = '00000000-0000-7000-8000-0000000a0009';

async function arrange(db: Db) {
  await db.arrange(
    `insert into audit (id, client_organisation_id, status, audit_type, postcode,
                        window_start_on, window_end_on, place_id)
     values ($1, $2, 'booked', 'street', 'SW1A 1AA', current_date + 7, current_date + 10, (select id from place where name = 'Westminster' and country_code = 'GB'))`,
    [AUDIT, ids.charityA],
  );
  await db.arrange(
    `insert into auditor_coverage (auditor_id, place_id, source)
         select $1, id, 'derived' from place where name = 'Westminster' and country_code = 'GB'
         on conflict do nothing`,
    [ids.auditor],
  );
  await db.arrange(
    "insert into auditor_capability (auditor_id, audit_type) values ($1, 'street') on conflict do nothing",
    [ids.auditor],
  );
}

const console_ = (db: Db, as: string) =>
  db
    .as(as)
    .query<{ auditor_id: string; eligible: boolean; reasons: string[] }>(
      'select auditor_id, eligible, reasons::text[] as reasons from assignment_console($1)',
      [AUDIT],
    );

describe('assignment_console (S4.2)', () => {
  it('shows everyone considered, not just who qualified', async () => {
    await withDatabase(async (db) => {
      await arrange(db);
      const rows = await console_(db, ids.admin);

      // eligible_auditors omits the rest by design; an operator deciding why
      // an audit has not been taken needs the opposite.
      const ids_ = rows.map((r) => r.auditor_id);
      expect(ids_).toContain(ids.auditor);
      expect(ids_).toContain(ids.otherAuditor);
    });
  });

  it('says why each one was set aside', async () => {
    await withDatabase(async (db) => {
      await arrange(db);
      const rows = await console_(db, ids.admin);
      const excluded = rows.find((r) => r.auditor_id === ids.otherAuditor);

      expect(excluded?.eligible).toBe(false);
      expect(excluded?.reasons).toContain('Does not cover this place');
      expect(excluded?.reasons).toContain('Not signed off for this methodology');
    });
  });

  it('leads with the blocking reason', async () => {
    await withDatabase(async (db) => {
      await arrange(db);
      await db.arrange(
        "insert into auditor_conflict (auditor_id, organisation_id, reason) values ($1, $2, 'former employee')",
        [ids.auditor, ids.charityA],
      );

      const row = (await console_(db, ids.admin)).find((r) => r.auditor_id === ids.auditor);
      expect(row?.reasons[0]).toBe('Declared conflict with this charity');
    });
  });

  it('gives an eligible auditor no reasons at all', async () => {
    await withDatabase(async (db) => {
      await arrange(db);
      const row = (await console_(db, ids.admin)).find((r) => r.auditor_id === ids.auditor);
      expect(row?.eligible).toBe(true);
      expect(row?.reasons).toEqual([]);
    });
  });

  it('puts the eligible ones first', async () => {
    await withDatabase(async (db) => {
      await arrange(db);
      const rows = await console_(db, ids.admin);
      expect(rows[0]?.eligible).toBe(true);
    });
  });

  it('agrees with eligible_auditors about who qualifies', async () => {
    await withDatabase(async (db) => {
      await arrange(db);
      const fromConsole = (await console_(db, ids.admin))
        .filter((r) => r.eligible)
        .map((r) => r.auditor_id)
        .sort();
      const fromFilter = (
        await db
          .as(ids.admin)
          .query<{ auditor_id: string }>('select * from eligible_auditors($1)', [AUDIT])
      )
        .map((r) => r.auditor_id)
        .sort();

      // Two readings of the same six sets. If they ever disagree, one of them
      // is lying to an operator about why an audit is stuck.
      expect(fromConsole).toEqual(fromFilter);
    });
  });

  it('is admin-only', async () => {
    await withDatabase(async (db) => {
      await arrange(db);
      expect(await console_(db, ids.clientA)).toEqual([]);
      expect(await console_(db, ids.auditor)).toEqual([]);
    });
  });
});
