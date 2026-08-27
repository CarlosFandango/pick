import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

const count = (rows: Record<string, unknown>[]) => rows.length;

describe('a signed-in user can use the database at all', () => {
  it('does not fall over on the RLS helper functions', async () => {
    // The regression this suite was written for: `authenticated` had EXECUTE
    // on the app.* helpers but no USAGE on the schema, so every policy raised
    // "permission denied for schema app" and the API was dead for every
    // signed-in user. postgres, service_role and anon all skip the policy
    // expression, so nothing else catches it.
    await withDatabase(async (db) => {
      await expect(db.as(ids.clientA).query('select count(*) from audit')).resolves.toBeDefined();
      await expect(db.as(ids.auditor).query('select count(*) from audit')).resolves.toBeDefined();
      await expect(db.as(ids.admin).query('select count(*) from audit')).resolves.toBeDefined();
    });
  });
});

describe('audit visibility', () => {
  it("shows a client only their own charity's audits", async () => {
    await withDatabase(async (db) => {
      const rows = await db.as(ids.clientA).query<{ id: string }>('select id from audit');
      expect(rows.map((r) => r.id)).toEqual([ids.auditA]);
    });
  });

  it('shows an auditor only the audits assigned to them', async () => {
    await withDatabase(async (db) => {
      const rows = await db.as(ids.auditor).query<{ id: string }>('select id from audit');
      expect(rows.map((r) => r.id)).toEqual([ids.auditA]);
    });
  });

  it("shows an admin every charity's audits, not just one", async () => {
    await withDatabase(async (db) => {
      const rows = await db.as(ids.admin).query<{ id: string }>('select id from audit');
      const seen = new Set(rows.map((r) => r.id));
      // Asserted by membership, not by count: a developer who booked something
      // locally should not fail the suite.
      expect(seen.has(ids.auditA)).toBe(true);
      expect(seen.has(ids.auditB)).toBe(true);
    });
  });

  it('refuses anon outright', async () => {
    await withDatabase(async (db) => {
      // anon holds no table privileges at all, so this fails at the GRANT
      // level rather than returning an empty list. Louder, and it does not
      // depend on every future table remembering to add a policy.
      const message = await db.as(null).expectRefused('select id from audit');
      expect(message).toMatch(/permission denied/i);
    });
  });

  it('does not leak one charity to another via a direct id lookup', async () => {
    await withDatabase(async (db) => {
      const rows = await db
        .as(ids.clientA)
        .query('select id from audit where id = $1', [ids.auditB]);
      expect(rows).toHaveLength(0);
    });
  });
});

describe('field events', () => {
  it('lets the assigned auditor record a check result', async () => {
    await withDatabase(async (db) => {
      const [check] = await db.arrange<{ id: string }>('select id from check_definition limit 1');
      await db.as(ids.auditor).query(
        `insert into check_result (id, audit_id, check_definition_id, auditor_id, outcome, occurred_at)
         values ('00000000-0000-7000-8000-0000000f0001', $1, $2, $3, 'pass', now())`,
        [ids.auditA, check?.id, ids.auditor],
      );
      expect(count(await db.as(ids.auditor).query('select id from check_result'))).toBe(1);
    });
  });

  it('refuses an auditor writing to an audit that is not theirs', async () => {
    await withDatabase(async (db) => {
      const [check] = await db.arrange<{ id: string }>('select id from check_definition limit 1');
      const message = await db.as(ids.otherAuditor).expectRefused(
        `insert into check_result (id, audit_id, check_definition_id, auditor_id, outcome, occurred_at)
         values ('00000000-0000-7000-8000-0000000f0002', $1, $2, $3, 'pass', now())`,
        [ids.auditA, check?.id, ids.otherAuditor],
      );
      expect(message).toMatch(/row-level security/i);
    });
  });

  it("refuses an auditor filing a result under someone else's name", async () => {
    await withDatabase(async (db) => {
      const [check] = await db.arrange<{ id: string }>('select id from check_definition limit 1');
      const message = await db.as(ids.auditor).expectRefused(
        `insert into check_result (id, audit_id, check_definition_id, auditor_id, outcome, occurred_at)
         values ('00000000-0000-7000-8000-0000000f0003', $1, $2, $3, 'pass', now())`,
        [ids.auditA, check?.id, ids.otherAuditor],
      );
      expect(message).toMatch(/row-level security/i);
    });
  });

  it('lets the client read results for their own audit', async () => {
    await withDatabase(async (db) => {
      const [check] = await db.arrange<{ id: string }>('select id from check_definition limit 1');
      await db.arrange(
        `insert into check_result (id, audit_id, check_definition_id, auditor_id, outcome, occurred_at)
         values ('00000000-0000-7000-8000-0000000f0004', $1, $2, $3, 'fail', now())`,
        [ids.auditA, check?.id, ids.auditor],
      );
      expect(count(await db.as(ids.clientA).query('select id from check_result'))).toBe(1);
      expect(count(await db.as(ids.clientB).query('select id from check_result'))).toBe(0);
    });
  });
});

describe('append-only tables reject mutation even for an admin', () => {
  it.each(['observation_log', 'check_result', 'credit_transaction'])(
    'refuses UPDATE on %s',
    async (table) => {
      await withDatabase(async (db) => {
        const message = await db.as(ids.admin).expectRefused(`update ${table} set id = id`);
        expect(message).toMatch(/append-only|permission denied/i);
      });
    },
  );

  it.each(['observation_log', 'check_result', 'credit_transaction'])(
    'refuses DELETE on %s',
    async (table) => {
      await withDatabase(async (db) => {
        const message = await db.as(ids.admin).expectRefused(`delete from ${table}`);
        expect(message).toMatch(/append-only|permission denied/i);
      });
    },
  );
});

describe('the credit ledger', () => {
  it("shows a client only their own organisation's transactions", async () => {
    await withDatabase(async (db) => {
      const rows = await db
        .as(ids.clientA)
        .query<{ organisation_id: string }>('select organisation_id from credit_transaction');
      expect(rows.every((r) => r.organisation_id === ids.charityA)).toBe(true);
      expect(rows).toHaveLength(1);
    });
  });

  it('scopes the balance view to the caller, not the whole table', async () => {
    await withDatabase(async (db) => {
      const rows = await db
        .as(ids.clientA)
        .query<{ balance: number }>('select balance from organisation_credit_balance');
      // security_invoker = true is what makes this respect the caller's RLS.
      expect(rows).toHaveLength(1);
      expect(Number(rows[0]?.balance)).toBe(10);
    });
  });

  it('refuses a client granting themselves credit', async () => {
    await withDatabase(async (db) => {
      const message = await db.as(ids.clientA).expectRefused(
        `insert into credit_transaction (organisation_id, delta, reason)
         values ($1, 1000, 'adjustment')`,
        [ids.charityA],
      );
      expect(message).toMatch(/row-level security/i);
    });
  });
});

describe('the credit price list', () => {
  it('lets a client read it — they cannot decide what to buy otherwise', async () => {
    await withDatabase(async (db) => {
      const rows = await db
        .as(ids.clientA)
        .query<{ quantity: number }>('select quantity from credit_bundle where is_active');
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  it('lets an auditor read it too — the price list is not confidential', async () => {
    await withDatabase(async (db) => {
      const rows = await db.as(ids.auditor).query('select quantity from credit_bundle');
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  it('refuses a client setting their own price', async () => {
    await withDatabase(async (db) => {
      const message = await db
        .as(ids.clientA)
        .expectRefused(
          'insert into credit_bundle (quantity, price_minor_units) values (99, 1)',
          [],
        );
      // Refused at the GRANT now, not the policy: the price list is seeded, so
      // no signed-in role writes it at all. Louder, and it does not depend on a
      // policy staying tight.
      expect(message).toMatch(/permission denied/i);
    });
  });

  it('keeps one active bundle per size, so a price is never ambiguous', async () => {
    await withDatabase(async (db) => {
      // As postgres, because this is the index doing the work and not a
      // policy — and no signed-in role, admin included, may write the price
      // list any more. Two active bundles of the same size would make "what
      // does one credit cost" a question with two answers.
      let message = '';
      try {
        await db.arrange(
          'insert into credit_bundle (quantity, price_minor_units) values (1, 99999)',
        );
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      expect(message).toMatch(/duplicate key|unique/i);
    });
  });
});

describe('organisations and profiles', () => {
  it('shows a client only their own organisation', async () => {
    await withDatabase(async (db) => {
      const rows = await db.as(ids.clientA).query<{ id: string }>('select id from organisation');
      expect(rows.map((r) => r.id)).toEqual([ids.charityA]);
    });
  });

  // These used to be silent no-ops: an UPDATE with no matching policy is
  // filtered by USING, changes nothing and raises nothing. Since profile and
  // organisation writes moved to the service role, `authenticated` holds no
  // UPDATE on either table at all, so the attempt now fails at the GRANT.
  // Louder, and it does not depend on a policy staying tight.
  it('does not let a client rename their organisation directly', async () => {
    await withDatabase(async (db) => {
      const message = await db
        .as(ids.clientA)
        .expectRefused('update organisation set name = $1 where id = $2', [
          'Hijacked',
          ids.charityA,
        ]);
      expect(message).toMatch(/permission denied/i);

      const [org] = await db.arrange<{ name: string }>(
        'select name from organisation where id = $1',
        [ids.charityA],
      );
      expect(org?.name).toBe('Charity A');
    });
  });

  it('does not let a client promote themselves to admin', async () => {
    await withDatabase(async (db) => {
      const message = await db
        .as(ids.clientA)
        .expectRefused('update user_profile set role = $1 where id = $2', [
          'pick_admin',
          ids.clientA,
        ]);
      expect(message).toMatch(/permission denied/i);

      const [profile] = await db.arrange<{ role: string }>(
        'select role from user_profile where id = $1',
        [ids.clientA],
      );
      expect(profile?.role).toBe('client');
    });
  });

  it("does not show one charity's staff to another", async () => {
    await withDatabase(async (db) => {
      const rows = await db.as(ids.clientA).query<{ id: string }>('select id from user_profile');
      expect(rows.map((r) => r.id).sort()).toEqual([ids.clientA]);
    });
  });
});

// The inventory assertions that used to live here — RLS on every table, a
// policy on every table, which privileges `authenticated` and `anon` hold —
// moved to surface.test.ts, where they sweep every table and every function
// rather than naming four of each. They were named-table checks, which is
// exactly how `anon` kept privileges on the four tables added after the revoke
// that was supposed to remove them.

describe('the check catalogue', () => {
  it('is readable by any signed-in user, minus the withheld column', async () => {
    await withDatabase(async (db) => {
      expect(
        count(await db.as(ids.auditor).query('select id, moment, prompt from check_definition')),
      ).toBeGreaterThan(0);
    });
  });

  it('is not readable by anon', async () => {
    await withDatabase(async (db) => {
      const message = await db.as(null).expectRefused('select id from check_definition');
      expect(message).toMatch(/permission denied/i);
    });
  });
});

describe('the auditor roster', () => {
  it('is admin-only, and shows a non-admin nothing rather than erroring', async () => {
    // Guarded with `where app.is_admin()` rather than a raise: a client
    // calling it gets an empty result, which is what RLS does everywhere else.
    await withDatabase(async (db) => {
      expect(await db.as(ids.clientA).query('select * from auditor_roster()')).toHaveLength(0);
      expect(await db.as(ids.auditor).query('select * from auditor_roster()')).toHaveLength(0);
      expect(
        (await db.as(ids.admin).query('select * from auditor_roster()')).length,
      ).toBeGreaterThan(0);
    });
  });

  it('puts anyone awaiting vetting first — it is a queue before a directory', async () => {
    await withDatabase(async (db) => {
      await db.arrange(
        "update auditor_profile set approval_status = 'pending', approved_at = null where user_id = $1",
        [ids.otherAuditor],
      );

      const rows = await db
        .as(ids.admin)
        .query<{ approval_status: string }>('select approval_status from auditor_roster()');

      expect(rows[0]?.approval_status).toBe('pending');
    });
  });

  it('refuses to let anyone but PICK approve an auditor', async () => {
    // The gate the whole marketplace hangs on: approval is what makes someone
    // eligible to be offered work at all.
    await withDatabase(async (db) => {
      for (const who of [ids.clientA, ids.auditor]) {
        const message = await db
          .as(who)
          .expectRefused('select approve_auditor($1)', [ids.otherAuditor]);
        expect(message).toMatch(/only PICK admin/i);
      }
    });
  });

  it('will not suspend anyone without a reason on the record', async () => {
    await withDatabase(async (db) => {
      const message = await db
        .as(ids.admin)
        .expectRefused('select suspend_auditor($1, $2)', [ids.auditor, '   ']);
      expect(message).toMatch(/reason is required/i);
    });
  });

  it('suspends future work without touching what was already earned', async () => {
    // They still did the audits they accepted, and are still owed for them.
    await withDatabase(async (db) => {
      const before = await db.arrange<{ count: string }>(
        'select count(*) from audit where auditor_id = $1',
        [ids.auditor],
      );

      await db.as(ids.admin).query('select suspend_auditor($1, $2)', [ids.auditor, 'test']);

      const after = await db.arrange<{ count: string }>(
        'select count(*) from audit where auditor_id = $1',
        [ids.auditor],
      );
      expect(after[0]?.count).toBe(before[0]?.count);
    });
  });
});

describe('the client roster and credit adjustments', () => {
  it('is admin-only', async () => {
    await withDatabase(async (db) => {
      expect(await db.as(ids.clientA).query('select * from client_roster()')).toHaveLength(0);
      expect(
        (await db.as(ids.admin).query('select * from client_roster()')).length,
      ).toBeGreaterThan(0);
    });
  });

  it('reports a balance that is the sum of the ledger, not a stored number', async () => {
    await withDatabase(async (db) => {
      const [before] = await db
        .as(ids.admin)
        .query<{ balance: number }>(
          'select balance from client_roster() where organisation_id = $1',
          [ids.charityA],
        );

      await db
        .as(ids.admin)
        .query('select adjust_credits($1, $2, $3)', [
          ids.charityA,
          3,
          'goodwill after a cancelled shift',
        ]);

      const [after] = await db
        .as(ids.admin)
        .query<{ balance: number }>(
          'select balance from client_roster() where organisation_id = $1',
          [ids.charityA],
        );

      expect(Number(after?.balance)).toBe(Number(before?.balance) + 3);
    });
  });

  it('records an adjustment as a new row, never an edit', async () => {
    // The ledger is evidence. A correction is another row; the balance is the
    // sum of what is shown and a charity can add it up themselves.
    await withDatabase(async (db) => {
      await db
        .as(ids.admin)
        .query('select adjust_credits($1, $2, $3)', [ids.charityA, -1, 'duplicate booking voided']);

      const rows = await db
        .as(ids.admin)
        .query<{ reason: string; note: string; created_by: string }>(
          "select reason, note, created_by from credit_transaction where organisation_id = $1 and reason = 'adjustment'",
          [ids.charityA],
        );

      expect(rows).toHaveLength(1);
      expect(rows[0]?.note).toBe('duplicate booking voided');
      expect(rows[0]?.created_by).toBe(ids.admin);
    });
  });

  it('refuses an adjustment with no reason, and one of zero', async () => {
    await withDatabase(async (db) => {
      const noReason = await db
        .as(ids.admin)
        .expectRefused('select adjust_credits($1, $2, $3)', [ids.charityA, 5, '  ']);
      expect(noReason).toMatch(/reason is required/i);

      const noChange = await db
        .as(ids.admin)
        .expectRefused('select adjust_credits($1, $2, $3)', [ids.charityA, 0, 'nothing']);
      expect(noChange).toMatch(/records nothing/i);
    });
  });

  it('refuses a client adjusting their own balance', async () => {
    await withDatabase(async (db) => {
      const message = await db
        .as(ids.clientA)
        .expectRefused('select adjust_credits($1, $2, $3)', [ids.charityA, 100, 'please']);
      expect(message).toMatch(/only PICK admin/i);
    });
  });
});
