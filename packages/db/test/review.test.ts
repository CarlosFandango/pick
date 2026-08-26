import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

type Db = Awaited<Parameters<Parameters<typeof withDatabase>[0]>[0]>;

const AUDIT = '00000000-0000-7000-8000-0000000a0006';

async function arrangeInReview(db: Db, status = 'in_review') {
  await db.arrange(
    `insert into audit (id, client_organisation_id, auditor_id, status, audit_type, postcode,
                        window_start_on, window_end_on, auditor_fee_minor_units)
     values ($1, $2, $3, $4, 'street', 'SW1A 1AA', current_date, current_date + 3, 11500)`,
    [AUDIT, ids.charityA, ids.auditor, status],
  );
}

const balance = async (db: Db) => {
  const [row] = await db.arrange<{ balance: number }>(
    'select balance from organisation_credit_balance where organisation_id = $1',
    [ids.charityA],
  );
  return Number(row?.balance ?? 0);
};

describe('review_gate_reason (S1.7)', () => {
  it('states why the audit is held, and where in the gate it sits', async () => {
    await withDatabase(async (db) => {
      await arrangeInReview(db);
      const [row] = await db
        .as(ids.admin)
        .query<{ review_gate_reason: string }>('select review_gate_reason($1)', [AUDIT]);
      // The reason comes before the actions: a reviewer needs to know why
      // before deciding what.
      expect(row?.review_gate_reason).toMatch(/first 3 audits are gated.*audit 1 of 3/i);
    });
  });

  it("counts the auditor's released audits toward the gate", async () => {
    await withDatabase(async (db) => {
      await arrangeInReview(db);
      await db.arrange(
        `insert into audit (client_organisation_id, auditor_id, status, postcode,
                            window_start_on, window_end_on)
         values ($1, $2, 'released', 'SW1A 1AA', current_date - 20, current_date - 18)`,
        [ids.charityB, ids.auditor],
      );

      const [row] = await db
        .as(ids.admin)
        .query<{ review_gate_reason: string }>('select review_gate_reason($1)', [AUDIT]);
      expect(row?.review_gate_reason).toMatch(/audit 2 of 3/i);
    });
  });

  it('stops gating once the auditor is established', async () => {
    await withDatabase(async (db) => {
      await arrangeInReview(db);
      for (let i = 0; i < 3; i += 1) {
        await db.arrange(
          `insert into audit (client_organisation_id, auditor_id, status, postcode,
                              window_start_on, window_end_on)
           values ($1, $2, 'released', 'SW1A 1AA', current_date - 20, current_date - 18)`,
          [ids.charityB, ids.auditor],
        );
      }

      const [row] = await db
        .as(ids.admin)
        .query<{ review_gate_reason: string | null }>('select review_gate_reason($1)', [AUDIT]);
      expect(row?.review_gate_reason).toBeNull();
    });
  });
});

describe('release_audit', () => {
  it('releases a reviewed audit to the client', async () => {
    await withDatabase(async (db) => {
      await arrangeInReview(db);
      const [audit] = await db
        .as(ids.admin)
        .query<{ status: string; released_at: string }>('select * from release_audit($1)', [AUDIT]);
      expect(audit?.status).toBe('released');
      expect(audit?.released_at).toBeTruthy();
    });
  });

  it('refuses to release anything not in review', async () => {
    await withDatabase(async (db) => {
      await arrangeInReview(db, 'assigned');
      const message = await db
        .as(ids.admin)
        .expectRefused('select * from release_audit($1)', [AUDIT]);
      expect(message).toMatch(/only an audit in review/i);
    });
  });

  it('refuses a client releasing their own audit', async () => {
    await withDatabase(async (db) => {
      await arrangeInReview(db);
      const message = await db
        .as(ids.clientA)
        .expectRefused('select * from release_audit($1)', [AUDIT]);
      expect(message).toMatch(/only PICK admin/i);
    });
  });

  it('refuses an auditor releasing their own work', async () => {
    await withDatabase(async (db) => {
      await arrangeInReview(db);
      const message = await db
        .as(ids.auditor)
        .expectRefused('select * from release_audit($1)', [AUDIT]);
      expect(message).toMatch(/only PICK admin/i);
    });
  });
});

describe('void_audit', () => {
  it('gives the credit back, because the client did not get an audit', async () => {
    await withDatabase(async (db) => {
      await arrangeInReview(db);
      const before = await balance(db);

      const [audit] = await db
        .as(ids.admin)
        .query<{ status: string }>('select * from void_audit($1, $2)', [
          AUDIT,
          'Auditor observed the wrong team',
        ]);

      expect(audit?.status).toBe('cancelled');
      // They should not pay for PICK rejecting its own output.
      expect(await balance(db)).toBe(before + 1);
    });
  });

  it('will not void without a reason', async () => {
    await withDatabase(async (db) => {
      await arrangeInReview(db);
      const message = await db
        .as(ids.admin)
        .expectRefused('select * from void_audit($1, $2)', [AUDIT, '   ']);
      expect(message).toMatch(/say why/i);
    });
  });

  it('refuses a client voiding an audit', async () => {
    await withDatabase(async (db) => {
      await arrangeInReview(db);
      const message = await db
        .as(ids.clientA)
        .expectRefused('select * from void_audit($1, $2)', [AUDIT, 'Not happy']);
      expect(message).toMatch(/only PICK admin/i);
    });
  });
});

describe('report_no_team_present', () => {
  it('pays the auditor in full and returns the credit', async () => {
    await withDatabase(async (db) => {
      await arrangeInReview(db, 'assigned');
      const before = await balance(db);

      const [audit] = await db
        .as(ids.auditor)
        .query<{ status: string }>('select * from report_no_team_present($1, $2)', [
          AUDIT,
          'Waited 45 minutes, nobody arrived',
        ]);

      // Never a failure: neither party did anything wrong.
      expect(audit?.status).toBe('no_team_present');
      expect(await balance(db)).toBe(before + 1);

      const [pay] = await db.arrange<{ amount_minor_units: number }>(
        "select amount_minor_units from audit_pay_item where audit_id = $1 and kind = 'no_show'",
        [AUDIT],
      );
      expect(Number(pay?.amount_minor_units)).toBe(11500);
    });
  });

  it('is never scored as a failure', async () => {
    await withDatabase(async (db) => {
      await arrangeInReview(db, 'assigned');
      await db.as(ids.auditor).query('select * from report_no_team_present($1)', [AUDIT]);

      const results = await db.arrange('select id from check_result where audit_id = $1', [AUDIT]);
      expect(results).toEqual([]);
    });
  });

  it('refuses another auditor reporting it', async () => {
    await withDatabase(async (db) => {
      await arrangeInReview(db, 'assigned');
      const message = await db
        .as(ids.otherAuditor)
        .expectRefused('select * from report_no_team_present($1)', [AUDIT]);
      expect(message).toMatch(/not yours/i);
    });
  });

  it('refuses once the audit is already released', async () => {
    await withDatabase(async (db) => {
      await arrangeInReview(db);
      await db.as(ids.admin).query('select * from release_audit($1)', [AUDIT]);
      const message = await db
        .as(ids.auditor)
        .expectRefused('select * from report_no_team_present($1)', [AUDIT]);
      expect(message).toMatch(/cannot be reported as no-show/i);
    });
  });
});
