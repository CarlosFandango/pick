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

  it('shows an admin everything', async () => {
    await withDatabase(async (db) => {
      expect(count(await db.as(ids.admin).query('select id from audit'))).toBe(2);
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

describe('organisations and profiles', () => {
  it('shows a client only their own organisation', async () => {
    await withDatabase(async (db) => {
      const rows = await db.as(ids.clientA).query<{ id: string }>('select id from organisation');
      expect(rows.map((r) => r.id)).toEqual([ids.charityA]);
    });
  });

  // An UPDATE with no matching policy is filtered by USING, so it changes
  // nothing and raises nothing — a silent no-op, not an error. Assert the data
  // is unchanged: that is the property that matters, and an error-shaped
  // assertion would pass for the wrong reason.
  it('does not let a client rename their organisation directly', async () => {
    await withDatabase(async (db) => {
      await db
        .as(ids.clientA)
        .query('update organisation set name = $1 where id = $2', ['Hijacked', ids.charityA]);

      const [org] = await db.arrange<{ name: string }>(
        'select name from organisation where id = $1',
        [ids.charityA],
      );
      expect(org?.name).toBe('Charity A');
    });
  });

  it('does not let a client promote themselves to admin', async () => {
    await withDatabase(async (db) => {
      await db
        .as(ids.clientA)
        .query('update user_profile set role = $1 where id = $2', ['pick_admin', ids.clientA]);

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

describe('table privileges are declared by the schema, not inherited', () => {
  // These passed locally and failed in CI purely because a newer Supabase CLI
  // bootstraps different default privileges. Assert what we depend on.
  it.each(['audit', 'check_definition', 'organisation', 'user_profile'])(
    'lets authenticated read %s',
    async (table) => {
      await withDatabase(async (db) => {
        const [row] = await db.arrange<{ ok: boolean }>(
          'select has_table_privilege($1, $2, $3) as ok',
          ['authenticated', `public.${table}`, 'select'],
        );
        expect(row?.ok).toBe(true);
      });
    },
  );

  it.each(['observation_log', 'check_result', 'credit_transaction'])(
    'withholds UPDATE and DELETE on %s even after the blanket grant',
    async (table) => {
      await withDatabase(async (db) => {
        const [row] = await db.arrange<{ upd: boolean; del: boolean }>(
          `select has_table_privilege($1, $2, 'update') as upd,
                  has_table_privilege($1, $2, 'delete') as del`,
          ['authenticated', `public.${table}`],
        );
        expect(row?.upd).toBe(false);
        expect(row?.del).toBe(false);
      });
    },
  );

  it('grants anon nothing', async () => {
    await withDatabase(async (db) => {
      const [row] = await db.arrange<{ ok: boolean }>(
        "select has_table_privilege('anon', 'public.audit', 'select') as ok",
      );
      expect(row?.ok).toBe(false);
    });
  });
});

describe('the check catalogue', () => {
  it('is readable by any signed-in user', async () => {
    await withDatabase(async (db) => {
      expect(
        count(await db.as(ids.auditor).query('select id from check_definition')),
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
