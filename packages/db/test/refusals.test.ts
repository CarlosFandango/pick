import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

type Db = Parameters<Parameters<typeof withDatabase>[0]>[0];

/**
 * What a signed-in user must not be able to do.
 *
 * The rest of this suite proves the right access works. That is the half which
 * fails loudly when it breaks — a screen goes empty and somebody notices. This
 * half proves the *wrong* access fails, which nothing else in the project
 * would ever notice, because a hole looks exactly like everything working.
 *
 * Written after three of them were found at once, and all three had the same
 * shape: a rule enforced inside a `security definer` function, and a table
 * privilege beside it that let a plain PATCH skip the function entirely. So
 * every case here goes at the table directly — `insert into audit`, not
 * `select book_audit(...)`. The RPC refusals live with the RPCs; this file is
 * about the door beside them.
 *
 * Adding an RPC? Add the matching refusal here for writing the same row without
 * it. That is the check that would have caught all three.
 */

const AUDIT = '00000000-0000-7000-8000-0000000a0009';
const OFFER = '00000000-0000-7000-8000-0000000b0009';

/** A booked audit with an open offer to the seeded auditor. */
async function arrangeOffer(db: Db) {
  await db.arrange(
    `insert into audit (id, client_organisation_id, status, audit_type, postcode,
                        window_start_on, window_end_on)
     values ($1, $2, 'booked', 'street', 'SW1A 1AA', current_date + 7, current_date + 10)`,
    [AUDIT, ids.charityA],
  );
  await db.arrange(
    `insert into audit_offer (id, audit_id, auditor_id, expires_at)
     values ($1, $2, $3, now() + interval '24 hours')`,
    [OFFER, AUDIT, ids.auditor],
  );
}

describe('an auditor cannot write their own outcome', () => {
  it('cannot set their own fee', async () => {
    await withDatabase(async (db) => {
      const message = await db
        .as(ids.auditor)
        .expectRefused('update audit set auditor_fee_pence = 999999 where id = $1', [ids.auditA]);
      expect(message).toMatch(/permission denied/i);
    });
  });

  it('cannot release their own audit past the review gate', async () => {
    await withDatabase(async (db) => {
      const message = await db
        .as(ids.auditor)
        .expectRefused("update audit set status = 'released', released_at = now() where id = $1", [
          ids.auditA,
        ]);
      expect(message).toMatch(/permission denied/i);
    });
  });

  it('cannot clear the flag that holds their first audits for review', async () => {
    await withDatabase(async (db) => {
      const message = await db
        .as(ids.auditor)
        .expectRefused('update audit set requires_review = false where id = $1', [ids.auditA]);
      expect(message).toMatch(/permission denied/i);
    });
  });

  it('cannot accept an offer without accept_offer running', async () => {
    await withDatabase(async (db) => {
      await arrangeOffer(db);

      // The damage this prevents is not just a skipped check: accepting this
      // way leaves the audit unassigned with no pay items, and the unique
      // partial index on (audit_id) where outcome = 'accepted' then stops
      // anyone accepting it properly, ever.
      const message = await db
        .as(ids.auditor)
        .expectRefused("update audit_offer set outcome = 'accepted' where id = $1", [OFFER]);
      expect(message).toMatch(/permission denied/i);

      const [audit] = await db.arrange<{ status: string }>(
        'select status from audit where id = $1',
        [AUDIT],
      );
      expect(audit?.status).toBe('booked');
    });
  });

  it('cannot write its own pay line', async () => {
    await withDatabase(async (db) => {
      const message = await db
        .as(ids.auditor)
        .expectRefused(
          "insert into audit_pay_item (audit_id, kind, amount_pence) values ($1, 'travel', 50000)",
          [ids.auditA],
        );
      expect(message).toMatch(/permission denied/i);
    });
  });
});

describe('a client cannot get an audit without paying for one', () => {
  it('cannot insert an audit directly', async () => {
    await withDatabase(async (db) => {
      // book_audit spends a credit in the same transaction as the insert. A
      // direct insert is an audit nobody paid for.
      const message = await db.as(ids.clientA).expectRefused(
        `insert into audit (client_organisation_id, status, audit_type, postcode,
                            window_start_on, window_end_on)
         values ($1, 'booked', 'street', 'SW1A 1AA', current_date + 7, current_date + 10)`,
        [ids.charityA],
      );
      expect(message).toMatch(/permission denied/i);
    });
  });

  it('cannot cancel an audit to get the credit back', async () => {
    await withDatabase(async (db) => {
      const message = await db
        .as(ids.clientA)
        .expectRefused("update audit set status = 'cancelled' where id = $1", [ids.auditA]);
      expect(message).toMatch(/permission denied/i);
    });
  });

  it('cannot delete an audit whose report it dislikes', async () => {
    await withDatabase(async (db) => {
      const message = await db
        .as(ids.clientA)
        .expectRefused('delete from audit where id = $1', [ids.auditA]);
      expect(message).toMatch(/permission denied/i);
    });
  });
});

describe('the catalogue is not editable through the API', () => {
  it('refuses an admin rewriting a check in place', async () => {
    await withDatabase(async (db) => {
      // A changed check is a new version, so historical results keep pointing
      // at exactly what was asked. Editing in place rewrites history silently.
      const message = await db
        .as(ids.admin)
        .expectRefused("update check_definition set prompt = 'reworded'");
      expect(message).toMatch(/permission denied/i);
    });
  });

  it('refuses an auditor adding a check of their own', async () => {
    await withDatabase(async (db) => {
      const message = await db.as(ids.auditor).expectRefused(
        `insert into check_definition (code, moment, compliance_category, prompt)
         values ('X-1', 'pitch', 'vulnerability', 'anything')`,
      );
      expect(message).toMatch(/permission denied/i);
    });
  });
});

describe('nobody edits identity through the API', () => {
  it('refuses an admin changing a role directly', async () => {
    await withDatabase(async (db) => {
      // Not because an admin may not do it, but because doing it here would
      // put the rule in a policy instead of in a tested server action.
      const message = await db
        .as(ids.admin)
        .expectRefused("update user_profile set role = 'pick_admin' where id = $1", [ids.auditor]);
      expect(message).toMatch(/permission denied/i);
    });
  });

  it('refuses an auditor widening their own coverage', async () => {
    await withDatabase(async (db) => {
      const message = await db
        .as(ids.auditor)
        .expectRefused(
          "insert into auditor_coverage (auditor_id, postcode_area) values ($1, 'EH')",
          [ids.auditor],
        );
      expect(message).toMatch(/permission denied/i);
    });
  });

  it('refuses an auditor deleting a declared conflict', async () => {
    await withDatabase(async (db) => {
      await db.arrange(
        `insert into auditor_conflict (auditor_id, organisation_id, reason)
         values ($1, $2, 'former employee')`,
        [ids.auditor, ids.charityA],
      );

      // Conflict is a hard block with no override. An auditor who can delete
      // the record can override it.
      const message = await db
        .as(ids.auditor)
        .expectRefused('delete from auditor_conflict where auditor_id = $1', [ids.auditor]);
      expect(message).toMatch(/permission denied/i);
    });
  });
});

describe('money is not writable by the people it concerns', () => {
  it('refuses a client crediting their own organisation', async () => {
    await withDatabase(async (db) => {
      const message = await db.as(ids.clientA).expectRefused(
        `insert into credit_transaction (organisation_id, delta, reason)
         values ($1, 100, 'purchase')`,
        [ids.charityA],
      );
      expect(message).toMatch(/row-level security/i);
    });
  });

  it('refuses an auditor opening a payout run', async () => {
    await withDatabase(async (db) => {
      const message = await db
        .as(ids.auditor)
        .expectRefused(
          'insert into payout_run (period_start, period_end) values (current_date, current_date)',
        );
      expect(message).toMatch(/permission denied/i);
    });
  });

  it('refuses an auditor adding a line to a payout run', async () => {
    await withDatabase(async (db) => {
      const [run] = await db.arrange<{ id: string }>(
        `insert into payout_run (period_start, period_end)
         values (current_date, current_date) returning id`,
      );
      const message = await db.as(ids.auditor).expectRefused(
        `insert into payout_line_item (payout_run_id, auditor_id, amount_pence)
         values ($1, $2, 100000)`,
        [run?.id, ids.auditor],
      );
      expect(message).toMatch(/permission denied/i);
    });
  });
});

describe('one charity cannot reach another', () => {
  it('refuses raising a complaint in another organisation name', async () => {
    await withDatabase(async (db) => {
      const message = await db.as(ids.clientA).expectRefused(
        `insert into complaint (organisation_id, subject, body, raised_by)
         values ($1, 'about_fundraiser', 'anything', $2)`,
        [ids.charityB, ids.clientA],
      );
      expect(message).toMatch(/row-level security/i);
    });
  });

  it('refuses resolving its own complaint', async () => {
    await withDatabase(async (db) => {
      const [complaint] = await db.arrange<{ id: string }>(
        `insert into complaint (organisation_id, subject, body, raised_by)
         values ($1, 'about_fundraiser', 'anything', $2) returning id`,
        [ids.charityA, ids.clientA],
      );

      // A charity that can close its own complaint makes the record meaningless.
      await db
        .as(ids.clientA)
        .query("update complaint set status = 'resolved' where id = $1", [complaint?.id]);

      const [after] = await db.arrange<{ status: string }>(
        'select status from complaint where id = $1',
        [complaint?.id],
      );
      expect(after?.status).toBe('open');
    });
  });
});

describe('anon is refused at the privilege level, on every table', () => {
  // Not "returns no rows" — refused. Every policy is `to authenticated`, so an
  // anonymous caller matching no policy would get an empty list either way,
  // and an empty list is indistinguishable from a working query. A hard
  // refusal is the only answer that cannot be misread.
  it('holds no privilege on any table in public', async () => {
    await withDatabase(async (db) => {
      const rows = await db.arrange<{ tablename: string }>(
        `select c.relname as tablename
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public'
           and c.relkind in ('r', 'v')
           and (
             has_table_privilege('anon', c.oid, 'select') or
             has_table_privilege('anon', c.oid, 'insert') or
             has_table_privilege('anon', c.oid, 'update') or
             has_table_privilege('anon', c.oid, 'delete')
           )
         order by 1`,
      );
      expect(rows.map((r) => r.tablename)).toEqual([]);
    });
  });

  it('is refused on a table added after the original revoke', async () => {
    await withDatabase(async (db) => {
      // `revoke ... on all tables` is a snapshot. complaint was created four
      // migrations later and quietly picked the platform's grants back up.
      const message = await db.as(null).expectRefused('select id from complaint');
      expect(message).toMatch(/permission denied/i);
    });
  });
});
