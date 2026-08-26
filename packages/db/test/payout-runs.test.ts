import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

type Db = Awaited<Parameters<Parameters<typeof withDatabase>[0]>[0]>;

const AUDIT = '00000000-0000-7000-8000-0000000a000b';

/** A released audit with pay items — the ordinary payable case. */
async function arrangePayable(db: Db, over: { status?: string; id?: string } = {}) {
  const id = over.id ?? AUDIT;
  await db.arrange(
    `insert into audit (id, client_organisation_id, auditor_id, status, audit_type, postcode,
                        window_start_on, window_end_on, completed_at)
     values ($1, $2, $3, $4, 'street', 'SW1A 1AA', current_date - 5, current_date - 3, now())`,
    [id, ids.charityA, ids.auditor, over.status ?? 'released'],
  );
  await db.arrange(
    `insert into audit_pay_item (audit_id, kind, amount_minor_units, note) values
       ($1, 'base', 10000, 'Audit fee'), ($1, 'travel', 1500, 'Travel uplift')`,
    [id],
  );
  return id;
}

/**
 * As the admin, not as postgres. `payable_audits()` guards with
 * `app.is_admin()`, which reads user_profile for auth.uid() — as postgres
 * that is null, so the function returns nothing and the test would be
 * asserting against a role that never evaluates the rule.
 */
const payable = (db: Db) =>
  db
    .as(ids.admin)
    .query<{ audit_id: string; amount_minor_units: string; gate: string }>(
      'select audit_id, amount_minor_units, gate from payable_audits()',
    );

describe('what is payable', () => {
  it('itemises an audit at the full fee, uplift included', async () => {
    await withDatabase(async (db) => {
      await db.arrange('update review_gate set enabled = false');
      const id = await arrangePayable(db);

      const rows = (await payable(db)).filter((r) => r.audit_id === id);
      expect(rows).toHaveLength(1);
      expect(Number(rows[0]?.amount_minor_units)).toBe(11500);
    });
  });

  it('pays a no-show, because the auditor travelled and waited', async () => {
    // Not an exception on the run. It is not their failure and it is not a
    // lesser kind of work.
    await withDatabase(async (db) => {
      await db.arrange('update review_gate set enabled = false');
      const id = await arrangePayable(db, { status: 'no_team_present' });

      expect((await payable(db)).map((r) => r.audit_id)).toContain(id);
    });
  });

  it('does not offer an audit that is already on a run', async () => {
    await withDatabase(async (db) => {
      await db.arrange('update review_gate set enabled = false');
      const id = await arrangePayable(db);
      await db
        .as(ids.admin)
        .query('select build_payout_run($1, $2)', [
          new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10),
          new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
        ]);

      expect((await payable(db)).map((r) => r.audit_id)).not.toContain(id);
    });
  });

  it('does not offer an audit that has not finished', async () => {
    await withDatabase(async (db) => {
      await db.arrange('update review_gate set enabled = false');
      const id = await arrangePayable(db, { status: 'in_review' });

      expect((await payable(db)).map((r) => r.audit_id)).not.toContain(id);
    });
  });

  it('is admin-only', async () => {
    await withDatabase(async (db) => {
      await arrangePayable(db);
      expect(await db.as(ids.auditor).query('select * from payable_audits()')).toHaveLength(0);
      expect(await db.as(ids.clientA).query('select * from payable_audits()')).toHaveLength(0);
    });
  });
});

describe('a payment hold, and only a payment hold', () => {
  it('keeps a held audit off the run', async () => {
    await withDatabase(async (db) => {
      await db.arrange('update review_gate set enabled = false');
      await db.arrange(
        "update review_gate set enabled = true, mode = 'hold', scope = 'payment' where trigger = 'manual'",
      );
      const id = await arrangePayable(db);
      await db.arrange("update audit set review_note = 'look at this' where id = $1", [id]);

      const run = await buildRun(db);
      const lines = await db.arrange(
        'select audit_id from payout_line_item where payout_run_id = $1',
        [run],
      );
      expect(lines).toHaveLength(0);
    });
  });

  it('pays an audit whose CLIENT COPY is held', async () => {
    // The separation that matters. A quality hold on the report must never
    // become a pay delay — otherwise the auditor's fee depends on how the
    // audit was received.
    await withDatabase(async (db) => {
      await db.arrange('update review_gate set enabled = false');
      await db.arrange(
        "update review_gate set enabled = true, mode = 'hold', scope = 'client_release' where trigger = 'manual'",
      );
      const id = await arrangePayable(db);
      await db.arrange("update audit set review_note = 'hold the report' where id = $1", [id]);

      const run = await buildRun(db);
      const lines = await db.arrange<{ audit_id: string }>(
        'select audit_id from payout_line_item where payout_run_id = $1',
        [run],
      );
      expect(lines.map((l) => l.audit_id)).toContain(id);
    });
  });
});

async function buildRun(db: Db) {
  const [run] = await db
    .as(ids.admin)
    .query<{ id: string }>('select (build_payout_run($1, $2)).id', [
      new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10),
      new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    ]);
  return run?.id as string;
}

describe('running a payout', () => {
  it('totals what it will pay', async () => {
    await withDatabase(async (db) => {
      await db.arrange('update review_gate set enabled = false');
      await arrangePayable(db);
      const run = await buildRun(db);

      const [row] = await db.arrange<{ total_minor_units: string; status: string }>(
        'select total_minor_units, status from payout_run where id = $1',
        [run],
      );
      expect(Number(row?.total_minor_units)).toBe(11500);
      expect(row?.status).toBe('draft');
    });
  });

  it('refuses to approve a run that pays nothing', async () => {
    await withDatabase(async (db) => {
      const run = await buildRun(db);
      const message = await db.as(ids.admin).expectRefused('select approve_payout_run($1)', [run]);
      expect(message).toMatch(/pays nothing/i);
    });
  });

  it('will not execute before it is approved', async () => {
    await withDatabase(async (db) => {
      await db.arrange('update review_gate set enabled = false');
      await arrangePayable(db);
      const run = await buildRun(db);

      const message = await db
        .as(ids.admin)
        .expectRefused('select execute_payout_run($1, $2)', [run, 'BACS-1']);
      expect(message).toMatch(/only an approved run/i);
    });
  });

  it('insists on the reference the money actually moved under', async () => {
    // `executed` is a claim about the outside world this database cannot
    // verify. The reference is the only evidence it happened.
    await withDatabase(async (db) => {
      await db.arrange('update review_gate set enabled = false');
      await arrangePayable(db);
      const run = await buildRun(db);
      await db.as(ids.admin).query('select approve_payout_run($1)', [run]);

      const message = await db
        .as(ids.admin)
        .expectRefused('select execute_payout_run($1, $2)', [run, '  ']);
      expect(message).toMatch(/reference/i);
    });
  });

  it('marks every line paid, carrying the reference', async () => {
    await withDatabase(async (db) => {
      await db.arrange('update review_gate set enabled = false');
      await arrangePayable(db);
      const run = await buildRun(db);
      await db.as(ids.admin).query('select approve_payout_run($1)', [run]);
      await db.as(ids.admin).query('select execute_payout_run($1, $2)', [run, 'BACS-99']);

      const lines = await db.arrange<{ status: string; external_reference: string }>(
        'select status, external_reference from payout_line_item where payout_run_id = $1',
        [run],
      );
      expect(lines.every((l) => l.status === 'paid')).toBe(true);
      expect(lines[0]?.external_reference).toBe('BACS-99');
    });
  });

  it('cannot pay one audit twice, across every run there has ever been', async () => {
    await withDatabase(async (db) => {
      await db.arrange('update review_gate set enabled = false');
      const id = await arrangePayable(db);
      const first = await buildRun(db);

      const message = await db.as(ids.admin).expectRefused(
        `insert into payout_line_item (payout_run_id, auditor_id, audit_id, amount_minor_units)
         values ($1, $2, $3, 100)`,
        [first, ids.auditor, id],
      );
      expect(message).toMatch(/duplicate key|unique/i);
    });
  });

  it('lets an auditor see their own line and nobody else’s', async () => {
    await withDatabase(async (db) => {
      await db.arrange('update review_gate set enabled = false');
      await arrangePayable(db);
      await buildRun(db);

      const mine = await db.as(ids.auditor).query('select id from payout_line_item');
      const theirs = await db.as(ids.otherAuditor).query('select id from payout_line_item');
      expect(mine.length).toBeGreaterThan(0);
      expect(theirs).toHaveLength(0);
    });
  });

  it('shows the run itself to nobody but PICK', async () => {
    await withDatabase(async (db) => {
      await buildRun(db);
      expect(await db.as(ids.auditor).query('select id from payout_run')).toHaveLength(0);
      expect(await db.as(ids.clientA).query('select id from payout_run')).toHaveLength(0);
    });
  });
});
