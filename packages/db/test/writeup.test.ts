import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

type Db = Awaited<Parameters<Parameters<typeof withDatabase>[0]>[0]>;

const AUDIT = '00000000-0000-7000-8000-0000000a0005';

async function arrangeAssigned(db: Db) {
  await db.arrange(
    `insert into audit (id, client_organisation_id, auditor_id, status, audit_type, postcode,
                        window_start_on, window_end_on)
     values ($1, $2, $3, 'assigned', 'street', 'SW1A 1AA', current_date, current_date + 3)`,
    [AUDIT, ids.charityA, ids.auditor],
  );
}

/** A verdict for every active check, as the device would send it. */
async function fullWriteUp(db: Db, override: Record<string, string> = {}) {
  const checks = await db.arrange<{ id: string }>(
    'select id from check_definition where version = 1 and is_active order by code',
  );
  return JSON.stringify(
    checks.map((check, i) => ({
      id: `00000000-0000-7000-8000-${String(i + 1).padStart(12, '0')}`,
      check_definition_id: check.id,
      outcome: override[check.id] ?? 'pass',
      occurred_at: new Date().toISOString(),
    })),
  );
}

describe('submit_write_up (S1.6)', () => {
  it('records every verdict and moves the audit into review', async () => {
    await withDatabase(async (db) => {
      await arrangeAssigned(db);
      const [audit] = await db
        .as(ids.auditor)
        .query<{ status: string }>('select * from submit_write_up($1, $2::jsonb)', [
          AUDIT,
          await fullWriteUp(db),
        ]);

      expect(audit?.status).toBe('in_review');
      const results = await db.arrange('select id from check_result where audit_id = $1', [AUDIT]);
      expect(results.length).toBe(29);
    });
  });

  it('refuses a partial write-up', async () => {
    await withDatabase(async (db) => {
      await arrangeAssigned(db);
      const [check] = await db.arrange<{ id: string }>('select id from check_definition limit 1');
      const partial = JSON.stringify([
        {
          id: '00000000-0000-7000-8000-00000000000f',
          check_definition_id: check?.id,
          outcome: 'pass',
        },
      ]);

      const message = await db
        .as(ids.auditor)
        .expectRefused('select * from submit_write_up($1, $2::jsonb)', [AUDIT, partial]);
      expect(message).toMatch(/incomplete: 1 of 29/i);
    });
  });

  it('is idempotent — a resend after a dropped connection changes nothing', async () => {
    await withDatabase(async (db) => {
      await arrangeAssigned(db);
      const payload = await fullWriteUp(db);

      await db
        .as(ids.auditor)
        .query('select * from submit_write_up($1, $2::jsonb)', [AUDIT, payload]);
      await db.arrange("update audit set status = 'assigned' where id = $1", [AUDIT]);
      await db
        .as(ids.auditor)
        .query('select * from submit_write_up($1, $2::jsonb)', [AUDIT, payload]);

      // Device-minted ids mean the second submit lands on the same rows.
      const results = await db.arrange('select id from check_result where audit_id = $1', [AUDIT]);
      expect(results.length).toBe(29);
    });
  });

  it('keeps notes attached to the verdict they explain', async () => {
    await withDatabase(async (db) => {
      await arrangeAssigned(db);
      const checks = await db.arrange<{ id: string }>(
        'select id from check_definition where version = 1 and is_active order by code',
      );
      const payload = JSON.stringify(
        checks.map((check, i) => ({
          id: `00000000-0000-7000-8000-${String(i + 1).padStart(12, '0')}`,
          check_definition_id: check.id,
          outcome: i === 0 ? 'fail' : 'pass',
          note: i === 0 ? 'Said donations double overnight' : '',
        })),
      );

      await db
        .as(ids.auditor)
        .query('select * from submit_write_up($1, $2::jsonb)', [AUDIT, payload]);

      const [failed] = await db.arrange<{ note: string }>(
        "select note from check_result where audit_id = $1 and outcome = 'fail'",
        [AUDIT],
      );
      expect(failed?.note).toBe('Said donations double overnight');
    });
  });

  it("refuses an auditor writing up someone else's audit", async () => {
    await withDatabase(async (db) => {
      await arrangeAssigned(db);
      const message = await db
        .as(ids.otherAuditor)
        .expectRefused('select * from submit_write_up($1, $2::jsonb)', [
          AUDIT,
          await fullWriteUp(db),
        ]);
      expect(message).toMatch(/not yours/i);
    });
  });

  it('refuses to write up an audit that is already released', async () => {
    await withDatabase(async (db) => {
      await arrangeAssigned(db);
      await db.arrange("update audit set status = 'released' where id = $1", [AUDIT]);
      const message = await db
        .as(ids.auditor)
        .expectRefused('select * from submit_write_up($1, $2::jsonb)', [
          AUDIT,
          await fullWriteUp(db),
        ]);
      expect(message).toMatch(/cannot be written up/i);
    });
  });

  it('leaves the results append-only after submitting', async () => {
    await withDatabase(async (db) => {
      await arrangeAssigned(db);
      await db
        .as(ids.auditor)
        .query('select * from submit_write_up($1, $2::jsonb)', [AUDIT, await fullWriteUp(db)]);

      const message = await db
        .as(ids.auditor)
        .expectRefused("update check_result set outcome = 'pass' where audit_id = $1", [AUDIT]);
      expect(message).toMatch(/append-only|permission denied/i);
    });
  });
});

describe('return_write_up (S2.4)', () => {
  it('unlocks only the moments PICK flagged', async () => {
    await withDatabase(async (db) => {
      await arrangeAssigned(db);
      await db
        .as(ids.auditor)
        .query('select * from submit_write_up($1, $2::jsonb)', [AUDIT, await fullWriteUp(db)]);

      const [audit] = await db
        .as(ids.admin)
        .query<{ status: string }>('select * from return_write_up($1, $2::audit_moment[], $3)', [
          AUDIT,
          '{pitch,ask}',
          'Please expand on the pitch',
        ]);
      expect(audit?.status).toBe('in_progress');

      // Cast to text[]: node-postgres has no parser for a custom enum array
      // and would otherwise hand back the raw literal.
      const [stored] = await db.arrange<{ moments: string[]; review_note: string }>(
        'select returned_moments::text[] as moments, review_note from audit where id = $1',
        [AUDIT],
      );
      expect(stored?.moments).toEqual(['pitch', 'ask']);
      expect(stored?.review_note).toBe('Please expand on the pitch');
    });
  });

  it('will not return without saying what needs rework', async () => {
    await withDatabase(async (db) => {
      await arrangeAssigned(db);
      await db
        .as(ids.auditor)
        .query('select * from submit_write_up($1, $2::jsonb)', [AUDIT, await fullWriteUp(db)]);

      const message = await db
        .as(ids.admin)
        .expectRefused('select * from return_write_up($1, $2::audit_moment[])', [AUDIT, '{}']);
      expect(message).toMatch(/say which moments/i);
    });
  });

  it('refuses an auditor returning their own write-up', async () => {
    await withDatabase(async (db) => {
      await arrangeAssigned(db);
      await db
        .as(ids.auditor)
        .query('select * from submit_write_up($1, $2::jsonb)', [AUDIT, await fullWriteUp(db)]);

      const message = await db
        .as(ids.auditor)
        .expectRefused('select * from return_write_up($1, $2::audit_moment[])', [AUDIT, '{pitch}']);
      expect(message).toMatch(/only PICK admin/i);
    });
  });

  it('refuses to return an audit that is not in review', async () => {
    await withDatabase(async (db) => {
      await arrangeAssigned(db);
      const message = await db
        .as(ids.admin)
        .expectRefused('select * from return_write_up($1, $2::audit_moment[])', [AUDIT, '{pitch}']);
      expect(message).toMatch(/only an audit in review/i);
    });
  });
});
