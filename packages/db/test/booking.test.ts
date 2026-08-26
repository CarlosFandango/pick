import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

/** Days from today, so the lead-time rule is exercised rather than dodged. */
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const book = (over: Record<string, unknown> = {}) => ({
  org: ids.charityA,
  type: 'street',
  method: 'direct_debit',
  postcode: 'SE15 4QL',
  from: inDays(7),
  to: inDays(9),
  av: false,
  ...over,
});

function call(b: ReturnType<typeof book>) {
  return {
    sql: 'select * from book_audit($1, $2, $3, $4, $5, $6, null, null, $7)',
    params: [b.org, b.type, b.method, b.postcode, b.from, b.to, b.av],
  };
}

describe('book_audit (S1.1)', () => {
  it('creates a booked audit and spends exactly one credit', async () => {
    await withDatabase(async (db) => {
      const { sql, params } = call(book());
      const [audit] = await db
        .as(ids.clientA)
        .query<{ status: string; reference: string }>(sql, params);

      expect(audit?.status).toBe('booked');
      expect(audit?.reference).toMatch(/^PS-\d{6}$/);

      const [balance] = await db
        .as(ids.clientA)
        .query<{ balance: number }>('select balance from organisation_credit_balance');
      expect(Number(balance?.balance)).toBe(9); // fixture seeds 10
    });
  });

  it('records the booking against the audit, so it cannot be charged twice', async () => {
    await withDatabase(async (db) => {
      const { sql, params } = call(book());
      const [audit] = await db.as(ids.clientA).query<{ id: string }>(sql, params);

      const rows = await db.arrange<{ delta: number; reason: string }>(
        'select delta, reason from credit_transaction where audit_id = $1',
        [audit?.id],
      );
      expect(rows).toEqual([{ delta: -1, reason: 'reservation' }]);
    });
  });

  it('refuses a window shorter than three days', async () => {
    await withDatabase(async (db) => {
      // The client picks a window, never the shift date — a team that knows
      // the date is not being observed doing what it normally does.
      const { sql, params } = call(book({ from: inDays(7), to: inDays(8) }));
      const message = await db.as(ids.clientA).expectRefused(sql, params);
      expect(message).toMatch(/at least three days/i);
    });
  });

  it('accepts a window of exactly three days', async () => {
    await withDatabase(async (db) => {
      const { sql, params } = call(book({ from: inDays(7), to: inDays(9) }));
      await expect(db.as(ids.clientA).query(sql, params)).resolves.toBeDefined();
    });
  });

  it('refuses to book with no credits, and charges nothing', async () => {
    await withDatabase(async (db) => {
      await db.arrange(
        "insert into credit_transaction (organisation_id, delta, reason) values ($1, -10, 'adjustment')",
        [ids.charityA],
      );

      const { sql, params } = call(book());
      const message = await db.as(ids.clientA).expectRefused(sql, params);
      expect(message).toMatch(/no credits available/i);

      const audits = await db.arrange('select id from audit where client_organisation_id = $1', [
        ids.charityA,
      ]);
      expect(audits).toHaveLength(1); // only the fixture's, none created
    });
  });

  it('refuses a client booking for another charity', async () => {
    await withDatabase(async (db) => {
      const { sql, params } = call(book({ org: ids.charityB }));
      const message = await db.as(ids.clientA).expectRefused(sql, params);
      expect(message).toMatch(/not permitted/i);
    });
  });

  it('refuses an auditor booking at all', async () => {
    await withDatabase(async (db) => {
      const { sql, params } = call(book());
      const message = await db.as(ids.auditor).expectRefused(sql, params);
      expect(message).toMatch(/not permitted/i);
    });
  });

  it('refuses anon', async () => {
    await withDatabase(async (db) => {
      const { sql, params } = call(book());
      const message = await db.as(null).expectRefused(sql, params);
      expect(message).toMatch(/permission denied|not signed in/i);
    });
  });

  it("lets an admin book on a charity's behalf", async () => {
    await withDatabase(async (db) => {
      const { sql, params } = call(book());
      const [audit] = await db.as(ids.admin).query<{ status: string }>(sql, params);
      expect(audit?.status).toBe('booked');
    });
  });

  it('rejects a postcode the schema does not recognise', async () => {
    await withDatabase(async (db) => {
      const { sql, params } = call(book({ postcode: 'NOT A POSTCODE' }));
      const message = await db.as(ids.clientA).expectRefused(sql, params);
      expect(message).toMatch(/postcode/i);
    });
  });

  it('derives the matching area from the postcode', async () => {
    await withDatabase(async (db) => {
      const { sql, params } = call(book({ postcode: 'se154ql' }));
      const [audit] = await db.as(ids.clientA).query<{ postcode_area: string }>(sql, params);
      expect(audit?.postcode_area).toBe('SE');
    });
  });

  it('refuses a window starting sooner than the lead time', async () => {
    await withDatabase(async (db) => {
      // Matching an auditor too close to the shift narrows the window enough
      // to give the date away.
      const { sql, params } = call(book({ from: inDays(1), to: inDays(4) }));
      const message = await db.as(ids.clientA).expectRefused(sql, params);
      expect(message).toMatch(/at least 5 days from today/i);
    });
  });

  it('records an A/V requirement on the audit', async () => {
    await withDatabase(async (db) => {
      const { sql, params } = call(book({ av: true }));
      const [audit] = await db.as(ids.clientA).query<{ requires_av: boolean }>(sql, params);
      expect(audit?.requires_av).toBe(true);
    });
  });

  it('never assigns an auditor at booking time', async () => {
    await withDatabase(async (db) => {
      const { sql, params } = call(book());
      const [audit] = await db.as(ids.clientA).query<{ auditor_id: string | null }>(sql, params);
      // "No auditor choice anywhere" — assignment is the system's job.
      expect(audit?.auditor_id).toBeNull();
    });
  });
});
