import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

type Db = Awaited<Parameters<Parameters<typeof withDatabase>[0]>[0]>;

const AUDIT = '00000000-0000-7000-8000-0000000a0009';

async function arrangeAudit(db: Db, over: { type?: string; auditor?: string } = {}) {
  await db.arrange(
    `insert into audit (id, client_organisation_id, auditor_id, status, audit_type, postcode,
                        window_start_on, window_end_on)
     values ($1, $2, $3, 'in_review', $4, 'SW1A 1AA', current_date, current_date + 3)`,
    [AUDIT, ids.charityA, over.auditor ?? ids.auditor, over.type ?? 'street'],
  );
}

const gateState = async (db: Db) => {
  const [row] = await db.arrange<{ payment: string; client_release: string }>(
    'select * from audit_gate_state($1)',
    [AUDIT],
  );
  return row;
};

const disableAll = (db: Db) => db.arrange('update review_gate set enabled = false');

describe('payment and client release are held independently', () => {
  it('never lets a quality hold become a pay delay', async () => {
    // The whole of TND-79. If an auditor's fee waits on anything about how the
    // audit was received, the auditor is being paid to keep the subject of the
    // audit happy.
    await withDatabase(async (db) => {
      await disableAll(db);
      await db.arrange(
        "update review_gate set enabled = true, mode = 'hold', scope = 'client_release' where trigger = 'client_first_audit'",
      );
      await arrangeAudit(db);

      const state = await gateState(db);
      expect(state?.client_release).toBe('hold');
      expect(state?.payment).toBe('auto_approve');
    });
  });

  it('holds payment only where a gate says payment', async () => {
    await withDatabase(async (db) => {
      await disableAll(db);
      await db.arrange(
        "update review_gate set enabled = true, mode = 'hold', scope = 'both' where trigger = 'audit_type_is_lottery'",
      );
      await arrangeAudit(db, { type: 'lottery' });

      const state = await gateState(db);
      expect(state?.payment).toBe('hold');
      expect(state?.client_release).toBe('hold');
    });
  });

  it('defaults to paying the auditor and holding the client copy', async () => {
    // Nothing reaches a client unreviewed; nothing delays an auditor by default.
    await withDatabase(async (db) => {
      const [payment] = await db.arrange<{ scope: string; mode: string }>(
        "select scope, mode from review_gate where trigger = 'client_first_audit'",
      );
      expect(payment?.scope).toBe('client_release');
      expect(payment?.mode).toBe('hold');
    });
  });
});

describe('resolving several gates at once', () => {
  it('takes the most restrictive mode', async () => {
    await withDatabase(async (db) => {
      await disableAll(db);
      await db.arrange(
        "update review_gate set enabled = true, mode = 'notify', scope = 'client_release' where trigger = 'auditor_first_of_type'",
      );
      await db.arrange(
        "update review_gate set enabled = true, mode = 'hold', scope = 'client_release' where trigger = 'client_first_audit'",
      );
      await arrangeAudit(db);

      expect((await gateState(db))?.client_release).toBe('hold');
    });
  });

  it('lets a disabled gate stop mattering', async () => {
    await withDatabase(async (db) => {
      await disableAll(db);
      await arrangeAudit(db);

      const state = await gateState(db);
      expect(state?.payment).toBe('auto_approve');
      expect(state?.client_release).toBe('auto_approve');
    });
  });
});

describe('the triggers themselves', () => {
  it('gates a new auditor for their first n audits', async () => {
    await withDatabase(async (db) => {
      await disableAll(db);
      await db.arrange(
        "update review_gate set enabled = true, threshold = 3 where trigger = 'auditor_first_n_audits'",
      );
      await arrangeAudit(db);

      const rows = await db.arrange<{ trigger: string; reason: string }>(
        'select trigger, reason from matching_review_gates($1)',
        [AUDIT],
      );
      expect(rows.map((r) => r.trigger)).toContain('auditor_first_n_audits');
      expect(rows[0]?.reason).toMatch(/first 3 audits/);
    });
  });

  it('does not gate an audit nobody has accepted on a track record it has not got', async () => {
    await withDatabase(async (db) => {
      await disableAll(db);
      await db.arrange(
        "update review_gate set enabled = true where trigger = 'auditor_first_n_audits'",
      );
      await db.arrange(
        `insert into audit (id, client_organisation_id, status, audit_type, postcode,
                            window_start_on, window_end_on)
         values ($1, $2, 'booked', 'street', 'SW1A 1AA', current_date + 7, current_date + 10)`,
        [AUDIT, ids.charityA],
      );

      expect(await db.arrange('select * from matching_review_gates($1)', [AUDIT])).toHaveLength(0);
    });
  });

  it('gates a lottery audit, which carries external regulatory exposure', async () => {
    await withDatabase(async (db) => {
      await disableAll(db);
      await db.arrange(
        "update review_gate set enabled = true where trigger = 'audit_type_is_lottery'",
      );
      await arrangeAudit(db, { type: 'lottery' });

      const rows = await db.arrange<{ trigger: string }>(
        'select trigger from matching_review_gates($1)',
        [AUDIT],
      );
      expect(rows.map((r) => r.trigger)).toEqual(['audit_type_is_lottery']);
    });
  });

  it('gates an assignment carrying an open risk', async () => {
    await withDatabase(async (db) => {
      await disableAll(db);
      await db.arrange(
        "update review_gate set enabled = true where trigger = 'assignment_has_open_risk'",
      );
      await arrangeAudit(db);
      await db.arrange(
        `insert into risk (type, subject_type, subject_id, detail, organisation_id)
         values ('exposure', 'assignment', $1, 'seen this charity recently', $2)`,
        [AUDIT, ids.charityA],
      );

      const rows = await db.arrange<{ trigger: string }>(
        'select trigger from matching_review_gates($1)',
        [AUDIT],
      );
      expect(rows.map((r) => r.trigger)).toContain('assignment_has_open_risk');
    });
  });

  it('stops gating once the risk is resolved', async () => {
    await withDatabase(async (db) => {
      await disableAll(db);
      await db.arrange(
        "update review_gate set enabled = true where trigger = 'assignment_has_open_risk'",
      );
      await arrangeAudit(db);
      await db.arrange(
        `insert into risk (type, subject_type, subject_id, detail, status)
         values ('exposure', 'assignment', $1, 'handled', 'resolved')`,
        [AUDIT],
      );

      expect(await db.arrange('select * from matching_review_gates($1)', [AUDIT])).toHaveLength(0);
    });
  });
});

describe('gate configuration', () => {
  it('insists a hold has a timeout, so a queue cannot block forever', async () => {
    // Without it, a blocked queue puts auditors back to waiting on one
    // person's availability — the failure the payment model exists to avoid.
    await withDatabase(async (db) => {
      const rows = await db.arrange<{ timeout_days: number }>(
        "select timeout_days from review_gate where mode = 'hold'",
      );
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) expect(Number(row.timeout_days)).toBeGreaterThan(0);
    });
  });

  it('is readable and writable by PICK only', async () => {
    await withDatabase(async (db) => {
      expect(await db.as(ids.clientA).query('select * from review_gate')).toHaveLength(0);
      expect((await db.as(ids.admin).query('select * from review_gate')).length).toBeGreaterThan(0);
    });
  });

  it('has exactly one row per trigger, so a trigger cannot mean two things', async () => {
    await withDatabase(async (db) => {
      const message = await db
        .as(ids.admin)
        .expectRefused("insert into review_gate (trigger) values ('manual')");
      expect(message).toMatch(/duplicate key|unique/i);
    });
  });
});
