import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

/**
 * S1.2 — the six eligibility sets.
 *
 * Each test removes exactly one condition and asserts the auditor disappears,
 * so a change that quietly drops a set from the query fails here rather than
 * in production, where it looks like a conflicted auditor getting sent to a
 * charity that sacked them.
 */

const AUDIT = '00000000-0000-7000-8000-0000000a0003';

/** A fresh booked audit plus an auditor who is eligible for it in every way. */
async function arrangeEligible(db: Awaited<Parameters<Parameters<typeof withDatabase>[0]>[0]>) {
  await db.arrange(
    `insert into audit (id, client_organisation_id, status, audit_type, postcode,
                        window_start_on, window_end_on)
     values ($1, $2, 'booked', 'street', 'SW1A 1AA', current_date + 7, current_date + 10)`,
    [AUDIT, ids.charityA],
  );
  await db.arrange(
    "insert into auditor_coverage (auditor_id, postcode_area) values ($1, 'SW') on conflict do nothing",
    [ids.auditor],
  );
  await db.arrange(
    "insert into auditor_capability (auditor_id, audit_type) values ($1, 'street') on conflict do nothing",
    [ids.auditor],
  );
}

const eligible = (db: Awaited<Parameters<Parameters<typeof withDatabase>[0]>[0]>) =>
  db
    .as(ids.admin)
    .query<{ auditor_id: string; match_reason: string; warnings: string[] }>(
      'select * from eligible_auditors($1)',
      [AUDIT],
    );

describe('eligible_auditors', () => {
  it('finds an auditor who satisfies all six sets, with the reason', async () => {
    await withDatabase(async (db) => {
      await arrangeEligible(db);
      const rows = await eligible(db);

      expect(rows.map((r) => r.auditor_id)).toContain(ids.auditor);
      expect(rows[0]?.match_reason).toMatch(/covers SW.*approved.*capable of street/i);
    });
  });

  it('excludes an auditor who does not cover the area (REACHABLE)', async () => {
    await withDatabase(async (db) => {
      await arrangeEligible(db);
      await db.arrange(
        "delete from auditor_coverage where auditor_id = $1 and postcode_area = 'SW'",
        [ids.auditor],
      );
      expect((await eligible(db)).map((r) => r.auditor_id)).not.toContain(ids.auditor);
    });
  });

  it('excludes an auditor who is not approved (APPROVED)', async () => {
    await withDatabase(async (db) => {
      await arrangeEligible(db);
      await db.arrange(
        "update auditor_profile set approval_status = 'pending' where user_id = $1",
        [ids.auditor],
      );
      expect((await eligible(db)).map((r) => r.auditor_id)).not.toContain(ids.auditor);
    });
  });

  it('excludes an auditor not signed off for the methodology (CAPABLE)', async () => {
    await withDatabase(async (db) => {
      await arrangeEligible(db);
      await db.arrange('delete from auditor_capability where auditor_id = $1', [ids.auditor]);
      expect((await eligible(db)).map((r) => r.auditor_id)).not.toContain(ids.auditor);
    });
  });

  it('excludes an auditor already committed in the window (AVAILABLE)', async () => {
    await withDatabase(async (db) => {
      await arrangeEligible(db);
      await db.arrange(
        `insert into audit (client_organisation_id, auditor_id, status, postcode,
                            window_start_on, window_end_on)
         values ($1, $2, 'assigned', 'SW1A 1AA', current_date + 8, current_date + 9)`,
        [ids.charityB, ids.auditor],
      );
      expect((await eligible(db)).map((r) => r.auditor_id)).not.toContain(ids.auditor);
    });
  });

  it('excludes an auditor this charity saw too recently (EXPOSURE)', async () => {
    await withDatabase(async (db) => {
      await arrangeEligible(db);
      await db.arrange(
        `insert into audit (client_organisation_id, auditor_id, status, postcode,
                            window_start_on, window_end_on)
         values ($1, $2, 'released', 'SW1A 1AA', current_date - 10, current_date - 8)`,
        [ids.charityA, ids.auditor],
      );
      expect((await eligible(db)).map((r) => r.auditor_id)).not.toContain(ids.auditor);
    });
  });

  it('excludes a conflicted auditor, with no way to override (NO-CONFLICT)', async () => {
    await withDatabase(async (db) => {
      await arrangeEligible(db);
      await db.arrange(
        "insert into auditor_conflict (auditor_id, organisation_id, reason) values ($1, $2, 'former employee')",
        [ids.auditor, ids.charityA],
      );
      // A conflicted auditor invalidates the audit. There is deliberately no
      // parameter that lets a caller include them anyway.
      expect((await eligible(db)).map((r) => r.auditor_id)).not.toContain(ids.auditor);
    });
  });

  it('warns about familiarity but still offers the audit', async () => {
    await withDatabase(async (db) => {
      await arrangeEligible(db);
      await db.arrange(
        `insert into audit (client_organisation_id, auditor_id, status, postcode,
                            window_start_on, window_end_on)
         values ($1, $2, 'released', 'SW1A 1AA', current_date - 400, current_date - 398)`,
        [ids.charityA, ids.auditor],
      );

      const rows = await eligible(db);
      const match = rows.find((r) => r.auditor_id === ids.auditor);
      // Outside the exposure window: risk of being recognised, not a block.
      expect(match).toBeDefined();
      expect(match?.warnings).toContain('familiarity');
    });
  });

  it('is not a directory for anyone who signs in', async () => {
    await withDatabase(async (db) => {
      await arrangeEligible(db);
      // security definer reads across the whole network, so it polices callers.
      expect(
        await db.as(ids.clientA).query('select * from eligible_auditors($1)', [AUDIT]),
      ).toEqual([]);
      expect(
        await db.as(ids.auditor).query('select * from eligible_auditors($1)', [AUDIT]),
      ).toEqual([]);
    });
  });
});

describe('offer_audit', () => {
  it('offers a booked audit to everyone eligible', async () => {
    await withDatabase(async (db) => {
      await arrangeEligible(db);
      const [result] = await db
        .as(ids.admin)
        .query<{ offer_audit: number }>('select offer_audit($1)', [AUDIT]);
      expect(Number(result?.offer_audit)).toBeGreaterThanOrEqual(1);

      const offers = await db.arrange<{ outcome: string; expires_at: string }>(
        'select outcome, expires_at from audit_offer where audit_id = $1',
        [AUDIT],
      );
      expect(offers[0]?.outcome).toBe('offered');
      expect(offers[0]?.expires_at).toBeTruthy();
    });
  });

  it('carries the warning onto the offer', async () => {
    await withDatabase(async (db) => {
      await arrangeEligible(db);
      await db.arrange(
        `insert into audit (client_organisation_id, auditor_id, status, postcode,
                            window_start_on, window_end_on)
         values ($1, $2, 'released', 'SW1A 1AA', current_date - 400, current_date - 398)`,
        [ids.charityA, ids.auditor],
      );
      await db.as(ids.admin).query('select offer_audit($1)', [AUDIT]);

      const [offer] = await db.arrange<{ warnings: string[] }>(
        'select warnings from audit_offer where audit_id = $1 and auditor_id = $2',
        [AUDIT, ids.auditor],
      );
      expect(offer?.warnings).toContain('familiarity');
    });
  });

  it('refuses to offer an audit that is not booked', async () => {
    await withDatabase(async (db) => {
      await arrangeEligible(db);
      // Already taken. The check constraint requires an auditor past 'booked',
      // which is itself the schema refusing an assigned audit with nobody on it.
      await db.arrange("update audit set auditor_id = $2, status = 'assigned' where id = $1", [
        AUDIT,
        ids.otherAuditor,
      ]);
      const message = await db.as(ids.admin).expectRefused('select offer_audit($1)', [AUDIT]);
      expect(message).toMatch(/only a booked audit/i);
    });
  });

  it('will not let an auditor offer work to themselves', async () => {
    await withDatabase(async (db) => {
      await arrangeEligible(db);
      const message = await db.as(ids.auditor).expectRefused('select offer_audit($1)', [AUDIT]);
      expect(message).toMatch(/only PICK admin/i);
    });
  });

  it('does not offer the same audit to the same auditor twice', async () => {
    await withDatabase(async (db) => {
      await arrangeEligible(db);
      await db.as(ids.admin).query('select offer_audit($1)', [AUDIT]);
      const [second] = await db
        .as(ids.admin)
        .query<{ offer_audit: number }>('select offer_audit($1)', [AUDIT]);
      expect(Number(second?.offer_audit)).toBe(0);
    });
  });
});

describe('A/V requirement (S3.1)', () => {
  const AV_AUDIT = '00000000-0000-7000-8000-0000000a0007';

  async function arrangeAvAudit(db: Awaited<Parameters<Parameters<typeof withDatabase>[0]>[0]>) {
    await db.arrange(
      `insert into audit (id, client_organisation_id, status, audit_type, postcode,
                          window_start_on, window_end_on, requires_av)
       values ($1, $2, 'booked', 'street', 'SW1A 1AA', current_date + 7, current_date + 10, true)`,
      [AV_AUDIT, ids.charityA],
    );
    await db.arrange(
      "insert into auditor_coverage (auditor_id, postcode_area) values ($1, 'SW') on conflict do nothing",
      [ids.auditor],
    );
    await db.arrange(
      "insert into auditor_capability (auditor_id, audit_type) values ($1, 'street') on conflict do nothing",
      [ids.auditor],
    );
  }

  it('excludes an auditor with no A/V capability', async () => {
    await withDatabase(async (db) => {
      await arrangeAvAudit(db);
      const rows = await db
        .as(ids.admin)
        .query<{ auditor_id: string }>('select * from eligible_auditors($1)', [AV_AUDIT]);
      // The client was told the pool would be smaller. This is that.
      expect(rows.map((r) => r.auditor_id)).not.toContain(ids.auditor);
    });
  });

  it('includes them once they are A/V equipped, and says so in the reason', async () => {
    await withDatabase(async (db) => {
      await arrangeAvAudit(db);
      await db.arrange('update auditor_profile set av_capable = true where user_id = $1', [
        ids.auditor,
      ]);

      const rows = await db
        .as(ids.admin)
        .query<{ auditor_id: string; match_reason: string }>(
          'select * from eligible_auditors($1)',
          [AV_AUDIT],
        );
      const match = rows.find((r) => r.auditor_id === ids.auditor);
      expect(match?.match_reason).toMatch(/A\/V equipped/);
    });
  });

  it('does not require A/V when the client did not ask for it', async () => {
    await withDatabase(async (db) => {
      await arrangeAvAudit(db);
      await db.arrange('update audit set requires_av = false where id = $1', [AV_AUDIT]);

      const rows = await db
        .as(ids.admin)
        .query<{ auditor_id: string }>('select * from eligible_auditors($1)', [AV_AUDIT]);
      expect(rows.map((r) => r.auditor_id)).toContain(ids.auditor);
    });
  });
});
