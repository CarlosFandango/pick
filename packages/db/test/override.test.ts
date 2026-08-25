import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

type Db = Awaited<Parameters<Parameters<typeof withDatabase>[0]>[0]>;

async function arrangePool(db: Db) {
  for (const auditor of [ids.auditor, ids.otherAuditor]) {
    await db.arrange(
      "insert into auditor_coverage (auditor_id, postcode_area) values ($1, 'SW') on conflict do nothing",
      [auditor],
    );
    await db.arrange(
      "insert into auditor_capability (auditor_id, audit_type) values ($1, 'street') on conflict do nothing",
      [auditor],
    );
  }
}

const pool = (db: Db, as: string, org = ids.charityA) =>
  db
    .as(as)
    .query<{ code: string; state: string; warning: string | null; av_capable: boolean }>(
      "select * from selectable_auditors($1, 'SW', 'street')",
      [org],
    );

describe('selectable_auditors (S3.2)', () => {
  it('shows auditors coded, never named', async () => {
    await withDatabase(async (db) => {
      await arrangePool(db);
      const rows = await pool(db, ids.clientA);

      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.code).toMatch(/^[0-9A-F]{6}$/);
      }
      // The client is never handed an identity, so it cannot send one back.
      expect(JSON.stringify(rows)).not.toMatch(/Auditor|@|example\.test/);
    });
  });

  it('gives two charities different codes for the same person', async () => {
    await withDatabase(async (db) => {
      await arrangePool(db);
      const mine = await pool(db, ids.clientA, ids.charityA);
      const theirs = await pool(db, ids.clientB, ids.charityB);

      // A code is meaningless outside the charity that holds it, so it cannot
      // be used to correlate an individual across organisations.
      expect(mine.map((r) => r.code).sort()).not.toEqual(theirs.map((r) => r.code).sort());
    });
  });

  it('gives the same charity a stable code, so they can re-pick someone', async () => {
    await withDatabase(async (db) => {
      await arrangePool(db);
      const first = await pool(db, ids.clientA);
      const second = await pool(db, ids.clientA);
      expect(first.map((r) => r.code)).toEqual(second.map((r) => r.code));
    });
  });

  it('warns about familiarity without blocking it', async () => {
    await withDatabase(async (db) => {
      await arrangePool(db);
      await db.arrange(
        `insert into audit (client_organisation_id, auditor_id, status, postcode,
                            window_start_on, window_end_on)
         values ($1, $2, 'released', 'SW1A 1AA', current_date - 10, current_date - 8)`,
        [ids.charityA, ids.auditor],
      );

      const rows = await pool(db, ids.clientA);
      const familiar = rows.find((r) => r.state === 'familiarity');
      expect(familiar?.warning).toMatch(/Familiarity warning.*1 times in 60 days.*can proceed/i);
    });
  });

  it('blocks a conflict outright and says so', async () => {
    await withDatabase(async (db) => {
      await arrangePool(db);
      await db.arrange(
        "insert into auditor_conflict (auditor_id, organisation_id, reason) values ($1, $2, 'former employee')",
        [ids.auditor, ids.charityA],
      );

      const rows = await pool(db, ids.clientA);
      const blocked = rows.find((r) => r.state === 'blocked');
      expect(blocked?.warning).toMatch(/declared conflict/i);
    });
  });

  it("will not let a charity look at another charity's pool", async () => {
    await withDatabase(async (db) => {
      await arrangePool(db);
      expect(await pool(db, ids.clientA, ids.charityB)).toEqual([]);
    });
  });
});

describe('prefer_auditor', () => {
  const AUDIT = '00000000-0000-7000-8000-0000000a0008';

  async function arrangeBooked(db: Db) {
    await arrangePool(db);
    await db.arrange(
      `insert into audit (id, client_organisation_id, status, audit_type, postcode,
                          window_start_on, window_end_on)
       values ($1, $2, 'booked', 'street', 'SW1A 1AA', current_date + 7, current_date + 10)`,
      [AUDIT, ids.charityA],
    );
  }

  it('records a preference from the code alone', async () => {
    await withDatabase(async (db) => {
      await arrangeBooked(db);
      const [first] = await pool(db, ids.clientA);

      const [audit] = await db
        .as(ids.clientA)
        .query<{ preferred_auditor_id: string }>('select * from prefer_auditor($1, $2)', [
          AUDIT,
          first?.code,
        ]);
      expect(audit?.preferred_auditor_id).toBeTruthy();
    });
  });

  it('refuses a conflicted auditor, with no way to proceed anyway', async () => {
    await withDatabase(async (db) => {
      await arrangeBooked(db);
      await db.arrange(
        "insert into auditor_conflict (auditor_id, organisation_id, reason) values ($1, $2, 'former employee')",
        [ids.auditor, ids.charityA],
      );

      const [code] = await db.arrange<{ code: string }>('select auditor_code_for($1, $2) as code', [
        ids.auditor,
        ids.charityA,
      ]);
      const message = await db
        .as(ids.clientA)
        .expectRefused('select * from prefer_auditor($1, $2)', [AUDIT, code?.code]);
      expect(message).toMatch(/declared conflict/i);
    });
  });

  it('refuses a code from another charity', async () => {
    await withDatabase(async (db) => {
      await arrangeBooked(db);
      const [code] = await db.arrange<{ code: string }>('select auditor_code_for($1, $2) as code', [
        ids.auditor,
        ids.charityB,
      ]);
      const message = await db
        .as(ids.clientA)
        .expectRefused('select * from prefer_auditor($1, $2)', [AUDIT, code?.code]);
      expect(message).toMatch(/no auditor with that code/i);
    });
  });

  it('refuses once the audit is already assigned', async () => {
    await withDatabase(async (db) => {
      await arrangeBooked(db);
      const [first] = await pool(db, ids.clientA);
      await db.arrange("update audit set auditor_id = $2, status = 'assigned' where id = $1", [
        AUDIT,
        ids.otherAuditor,
      ]);

      const message = await db
        .as(ids.clientA)
        .expectRefused('select * from prefer_auditor($1, $2)', [AUDIT, first?.code]);
      expect(message).toMatch(/before the audit is assigned/i);
    });
  });

  it("refuses another charity's audit", async () => {
    await withDatabase(async (db) => {
      await arrangeBooked(db);
      const [first] = await pool(db, ids.clientA);
      const message = await db
        .as(ids.clientB)
        .expectRefused('select * from prefer_auditor($1, $2)', [AUDIT, first?.code]);
      expect(message).toMatch(/not your audit/i);
    });
  });
});
