import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

type Db = Awaited<Parameters<Parameters<typeof withDatabase>[0]>[0]>;

const AUDIT = '00000000-0000-7000-8000-0000000a0004';

/** A booked audit, offered to both seeded auditors. */
async function arrangeOffers(db: Db) {
  await db.arrange(
    `insert into audit (id, client_organisation_id, status, audit_type, postcode,
                        window_start_on, window_end_on, pitch_detail)
     values ($1, $2, 'booked', 'street', 'SW1A 1AA', current_date + 7, current_date + 10,
             'Outside the station, north entrance')`,
    [AUDIT, ids.charityA],
  );
  for (const auditor of [ids.auditor, ids.otherAuditor]) {
    await db.arrange(
      `insert into audit_offer (audit_id, auditor_id, match_reason, expires_at)
       values ($1, $2, 'covers SW', now() + interval '24 hours')`,
      [AUDIT, auditor],
    );
  }
}

const offerIdFor = async (db: Db, auditor: string) => {
  const [row] = await db.arrange<{ id: string }>(
    'select id from audit_offer where audit_id = $1 and auditor_id = $2',
    [AUDIT, auditor],
  );
  return row?.id as string;
};

describe('the offer an auditor sees (S1.3)', () => {
  it('shows the offer to the auditor it was made to', async () => {
    await withDatabase(async (db) => {
      await arrangeOffers(db);
      const rows = await db
        .as(ids.auditor)
        .query<{ audit_id: string }>('select audit_id from audit_offer');
      expect(rows.map((r) => r.audit_id)).toContain(AUDIT);
    });
  });

  it("does not show one auditor another auditor's offer", async () => {
    await withDatabase(async (db) => {
      await arrangeOffers(db);
      const mine = await db
        .as(ids.auditor)
        .query<{ auditor_id: string }>('select auditor_id from audit_offer');
      expect(mine.every((r) => r.auditor_id === ids.auditor)).toBe(true);
    });
  });

  it('withholds the exact pitch until the audit is accepted', async () => {
    await withDatabase(async (db) => {
      await arrangeOffers(db);
      // Area, not address. An auditor who never takes the job never learns
      // where the team will be — otherwise the offer itself is a leak.
      const rows = await db.as(ids.auditor).query('select id from audit where id = $1', [AUDIT]);
      expect(rows).toHaveLength(0);
    });
  });

  it('shows total pay before accepting, itemised', async () => {
    await withDatabase(async (db) => {
      await arrangeOffers(db);
      const [offer] = await db
        .as(ids.auditor)
        .query<{ travel_uplift_minor_units: number }>(
          'select travel_uplift_minor_units from audit_offer',
        );
      const [base] = await db
        .as(ids.auditor)
        .query<{ base: number }>('select base_audit_fee_minor_units() as base');
      expect(Number(base?.base)).toBe(10000);
      expect(Number(offer?.travel_uplift_minor_units)).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('accept_offer', () => {
  it('assigns the audit and reveals the pitch', async () => {
    await withDatabase(async (db) => {
      await arrangeOffers(db);
      const offer = await offerIdFor(db, ids.auditor);

      const [audit] = await db
        .as(ids.auditor)
        .query<{ status: string; auditor_id: string }>('select * from accept_offer($1)', [offer]);
      expect(audit?.status).toBe('assigned');
      expect(audit?.auditor_id).toBe(ids.auditor);

      const [visible] = await db
        .as(ids.auditor)
        .query<{ pitch_detail: string }>('select pitch_detail from audit where id = $1', [AUDIT]);
      expect(visible?.pitch_detail).toContain('north entrance');
    });
  });

  it('writes the pay down as itemised lines at the moment of acceptance', async () => {
    await withDatabase(async (db) => {
      await arrangeOffers(db);
      await db
        .as(ids.auditor)
        .query('select * from accept_offer($1)', [await offerIdFor(db, ids.auditor)]);

      const items = await db.arrange<{ kind: string; amount_minor_units: number }>(
        'select kind, amount_minor_units from audit_pay_item where audit_id = $1 order by kind',
        [AUDIT],
      );
      // Recorded at acceptance so it cannot drift from what they were shown.
      expect(items).toEqual([
        { kind: 'base', amount_minor_units: 10000 },
        { kind: 'travel', amount_minor_units: 1500 },
      ]);

      const [audit] = await db.arrange<{ auditor_fee_minor_units: number }>(
        'select auditor_fee_minor_units from audit where id = $1',
        [AUDIT],
      );
      expect(Number(audit?.auditor_fee_minor_units)).toBe(11500);
    });
  });

  it('withdraws the offer from everyone else', async () => {
    await withDatabase(async (db) => {
      await arrangeOffers(db);
      await db
        .as(ids.auditor)
        .query('select * from accept_offer($1)', [await offerIdFor(db, ids.auditor)]);

      const [other] = await db.arrange<{ outcome: string }>(
        'select outcome from audit_offer where audit_id = $1 and auditor_id = $2',
        [AUDIT, ids.otherAuditor],
      );
      // They find out it is gone rather than accepting into a wall.
      expect(other?.outcome).toBe('withdrawn');
    });
  });

  it('lets only one auditor win', async () => {
    await withDatabase(async (db) => {
      await arrangeOffers(db);
      await db
        .as(ids.auditor)
        .query('select * from accept_offer($1)', [await offerIdFor(db, ids.auditor)]);

      const message = await db
        .as(ids.otherAuditor)
        .expectRefused('select * from accept_offer($1)', [await offerIdFor(db, ids.otherAuditor)]);
      expect(message).toMatch(/already withdrawn|no longer available/i);
    });
  });

  it('refuses an offer that belongs to someone else', async () => {
    await withDatabase(async (db) => {
      await arrangeOffers(db);
      const message = await db
        .as(ids.otherAuditor)
        .expectRefused('select * from accept_offer($1)', [await offerIdFor(db, ids.auditor)]);
      expect(message).toMatch(/not yours/i);
    });
  });

  it('refuses an expired offer', async () => {
    await withDatabase(async (db) => {
      await arrangeOffers(db);
      await db.arrange("update audit_offer set expires_at = now() - interval '1 hour'");
      const message = await db
        .as(ids.auditor)
        .expectRefused('select * from accept_offer($1)', [await offerIdFor(db, ids.auditor)]);
      expect(message).toMatch(/expired/i);
    });
  });

  it("refuses a client accepting on an auditor's behalf", async () => {
    await withDatabase(async (db) => {
      await arrangeOffers(db);
      const message = await db
        .as(ids.clientA)
        .expectRefused('select * from accept_offer($1)', [await offerIdFor(db, ids.auditor)]);
      expect(message).toMatch(/not yours/i);
    });
  });
});

describe('decline_offer', () => {
  it('closes the offer and keeps the reason', async () => {
    await withDatabase(async (db) => {
      await arrangeOffers(db);
      await db
        .as(ids.auditor)
        .query('select decline_offer($1, $2)', [
          await offerIdFor(db, ids.auditor),
          'Working that week',
        ]);

      const [offer] = await db.arrange<{ outcome: string; decline_reason: string }>(
        'select outcome, decline_reason from audit_offer where audit_id = $1 and auditor_id = $2',
        [AUDIT, ids.auditor],
      );
      expect(offer?.outcome).toBe('declined');
      expect(offer?.decline_reason).toBe('Working that week');
    });
  });

  it('leaves the audit bookable by someone else', async () => {
    await withDatabase(async (db) => {
      await arrangeOffers(db);
      await db
        .as(ids.auditor)
        .query('select decline_offer($1)', [await offerIdFor(db, ids.auditor)]);

      const [audit] = await db.arrange<{ status: string }>(
        'select status from audit where id = $1',
        [AUDIT],
      );
      expect(audit?.status).toBe('booked');

      const [accepted] = await db
        .as(ids.otherAuditor)
        .query<{ status: string }>('select * from accept_offer($1)', [
          await offerIdFor(db, ids.otherAuditor),
        ]);
      expect(accepted?.status).toBe('assigned');
    });
  });

  it('refuses to decline twice', async () => {
    await withDatabase(async (db) => {
      await arrangeOffers(db);
      const offer = await offerIdFor(db, ids.auditor);
      await db.as(ids.auditor).query('select decline_offer($1)', [offer]);
      const message = await db.as(ids.auditor).expectRefused('select decline_offer($1)', [offer]);
      expect(message).toMatch(/already declined/i);
    });
  });
});
