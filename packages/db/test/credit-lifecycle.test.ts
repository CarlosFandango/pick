import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

type Db = Awaited<Parameters<Parameters<typeof withDatabase>[0]>[0]>;

const position = async (db: Db, org: string) => {
  const [row] = await db.arrange<Record<string, number>>(
    'select * from organisation_credit_position where organisation_id = $1',
    [org],
  );
  return row;
};

/** Books an audit as the client, returning its id. */
async function book(db: Db) {
  const [audit] = await db.as(ids.clientA).query<{ id: string }>(
    `select (book_audit($1, 'street', 'direct_debit', 'SW1A 1AA',
                        current_date + 7, current_date + 10)).id`,
    [ids.charityA],
  );
  return audit?.id as string;
}

describe('reserve at booking, consume at release', () => {
  it('sets a credit aside rather than spending it', async () => {
    // The distinction that matters: at booking the charity has committed a
    // credit but not yet received anything for it.
    await withDatabase(async (db) => {
      const before = await position(db, ids.charityA);
      await book(db);
      const after = await position(db, ids.charityA);

      expect(Number(after?.available)).toBe(Number(before?.available) - 1);
      expect(Number(after?.consumed)).toBe(Number(before?.consumed));
    });
  });

  it('spends it only once the client actually has the audit', async () => {
    await withDatabase(async (db) => {
      const auditId = await book(db);
      const reserved = await position(db, ids.charityA);

      await db.arrange("update audit set status = 'in_review', auditor_id = $2 where id = $1", [
        auditId,
        ids.auditor,
      ]);
      await db.as(ids.admin).query('select release_audit($1)', [auditId]);

      const after = await position(db, ids.charityA);
      // Consumption settles the reservation; it does not move the balance
      // again, because the credit left when it was reserved.
      expect(Number(after?.consumed)).toBe(Number(reserved?.consumed) + 1);
      expect(Number(after?.available)).toBe(Number(reserved?.available));
    });
  });

  it('hands the credit back when nobody was there', async () => {
    // The auditor is still paid in full. The charity is not charged for an
    // audit that never happened.
    await withDatabase(async (db) => {
      const before = await position(db, ids.charityA);
      const auditId = await book(db);

      await db.arrange("update audit set status = 'assigned', auditor_id = $2 where id = $1", [
        auditId,
        ids.auditor,
      ]);
      await db.as(ids.auditor).query('select report_no_team_present($1)', [auditId]);

      const after = await position(db, ids.charityA);
      expect(Number(after?.available)).toBe(Number(before?.available));
      expect(Number(after?.consumed)).toBe(Number(before?.consumed));
    });
  });

  it('hands it back when PICK voids its own output', async () => {
    await withDatabase(async (db) => {
      const before = await position(db, ids.charityA);
      const auditId = await book(db);

      await db.arrange("update audit set status = 'in_review', auditor_id = $2 where id = $1", [
        auditId,
        ids.auditor,
      ]);
      await db.as(ids.admin).query('select void_audit($1, $2)', [auditId, 'unusable write-up']);

      expect(Number((await position(db, ids.charityA))?.available)).toBe(Number(before?.available));
    });
  });

  it('settles a reservation once and only once', async () => {
    await withDatabase(async (db) => {
      const auditId = await book(db);
      await db.arrange("update audit set status = 'in_review', auditor_id = $2 where id = $1", [
        auditId,
        ids.auditor,
      ]);

      await db.as(ids.admin).query('select release_audit($1)', [auditId]);
      // Calling it again is a no-op rather than a second consumption: bookkeeping
      // must never be able to charge a charity twice.
      await db.as(ids.admin).query('select consume_credit_for($1)', [auditId]);

      const rows = await db.arrange(
        "select id from credit_transaction where audit_id = $1 and reason = 'consumption'",
        [auditId],
      );
      expect(rows).toHaveLength(1);
    });
  });
});

describe('credits are not fungible', () => {
  it('records which purchase a booking drew from, and what it cost', async () => {
    // A £250 single and a £187.50 bundle credit are worth different amounts.
    // Without this, revenue per audit is a guess.
    await withDatabase(async (db) => {
      const auditId = await book(db);

      const [row] = await db.arrange<{
        source_purchase_id: string | null;
        unit_price_minor_units: number | null;
      }>(
        `select source_purchase_id, unit_price_minor_units from credit_transaction
         where audit_id = $1 and reason = 'reservation'`,
        [auditId],
      );

      expect(row?.source_purchase_id).not.toBeNull();
      expect(Number(row?.unit_price_minor_units)).toBeGreaterThan(0);
    });
  });

  it('draws from the oldest purchase with capacity left — FIFO', async () => {
    await withDatabase(async (db) => {
      const [oldest] = await db.arrange<{ id: string }>(
        `select id from credit_transaction
         where organisation_id = $1 and reason = 'purchase'
         order by occurred_at, id limit 1`,
        [ids.charityA],
      );

      const auditId = await book(db);
      const [row] = await db.arrange<{ source_purchase_id: string }>(
        "select source_purchase_id from credit_transaction where audit_id = $1 and reason = 'reservation'",
        [auditId],
      );

      expect(row?.source_purchase_id).toBe(oldest?.id);
    });
  });

  it('frees a purchase’s credit again once a reservation is handed back', async () => {
    await withDatabase(async (db) => {
      const auditId = await book(db);
      await db.arrange("update audit set status = 'in_review', auditor_id = $2 where id = $1", [
        auditId,
        ids.auditor,
      ]);
      await db.as(ids.admin).query('select void_audit($1, $2)', [auditId, 'test']);

      // The next booking may legitimately draw the same credit.
      const second = await book(db);
      const [row] = await db.arrange<{ source_purchase_id: string | null }>(
        "select source_purchase_id from credit_transaction where audit_id = $1 and reason = 'reservation'",
        [second],
      );
      expect(row?.source_purchase_id).not.toBeNull();
    });
  });
});

describe('the ledger stays evidence', () => {
  it('refuses to reserve twice for one audit', async () => {
    await withDatabase(async (db) => {
      const auditId = await book(db);
      // The unique partial index is the guard, not application code.
      const failure = await db.as(ids.admin).expectRefused(
        `insert into credit_transaction (organisation_id, delta, reason, audit_id)
           values ($1, -1, 'reservation', $2)`,
        [ids.charityA, auditId],
      );
      expect(failure).toMatch(/duplicate key|unique/i);
    });
  });

  it('still refuses UPDATE and DELETE, whatever the new reasons are', async () => {
    await withDatabase(async (db) => {
      const message = await db
        .as(ids.admin)
        .expectRefused("update credit_transaction set reason = 'purchase'");
      expect(message).toMatch(/append-only|permission denied/i);
    });
  });
});
