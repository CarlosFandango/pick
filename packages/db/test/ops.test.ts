import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

type Db = Awaited<Parameters<Parameters<typeof withDatabase>[0]>[0]>;

const queue = (db: Db, as: string) =>
  db
    .as(as)
    .query<{ kind: string; reference: string; summary: string; target_id: string | null }>(
      'select * from ops_queue()',
    );

describe('ops_queue (S4.1)', () => {
  it('is admin-only — it is the whole network on one screen', async () => {
    await withDatabase(async (db) => {
      expect(await queue(db, ids.clientA)).toEqual([]);
      expect(await queue(db, ids.auditor)).toEqual([]);
    });
  });

  it('surfaces an audit whose window is nearly here and nobody has taken', async () => {
    await withDatabase(async (db) => {
      await db.arrange(
        `insert into audit (client_organisation_id, status, audit_type, postcode,
                            window_start_on, window_end_on, requested_at)
         values ($1, 'booked', 'street', 'N16 8AA', current_date + 1, current_date + 4, now())`,
        [ids.charityA],
      );

      const items = await queue(db, ids.admin);
      const urgent = items.find((i) => i.kind === 'offer_expiring');
      expect(urgent?.summary).toMatch(/N16 8AA · street/);
    });
  });

  it('ranks the most urgent first', async () => {
    await withDatabase(async (db) => {
      await db.arrange(
        `insert into audit (client_organisation_id, status, audit_type, postcode,
                            window_start_on, window_end_on, requested_at)
         values ($1, 'booked', 'street', 'N16 8AA', current_date + 1, current_date + 4, now())`,
        [ids.charityA],
      );
      await db.arrange(
        `insert into audit (client_organisation_id, auditor_id, status, postcode,
                            window_start_on, window_end_on, submitted_at)
         values ($1, $2, 'in_review', 'SE15 4QL', current_date - 3, current_date - 1, now())`,
        [ids.charityA, ids.auditor],
      );

      const kinds = (await queue(db, ids.admin)).map((i) => i.kind);
      expect(kinds.indexOf('offer_expiring')).toBeLessThan(kinds.indexOf('review_gate'));
    });
  });

  it('lists an open complaint with whose it is and what it is about', async () => {
    await withDatabase(async (db) => {
      await db.arrange(
        `insert into complaint (organisation_id, subject, body, raised_by)
         values ($1, 'about_fundraiser', 'Followed someone', $2)`,
        [ids.charityA, ids.clientA],
      );

      // Matched specifically: the UX suite raises real complaints against the
      // seeded charity, so "the first complaint" is not stable.
      const items = await queue(db, ids.admin);
      const mine = items.find((i) => i.kind === 'complaint' && i.summary.startsWith('Charity A'));
      expect(mine?.summary).toBe('Charity A — about a fundraiser');
    });
  });

  it('counts auditor applications as one line, not one each', async () => {
    await withDatabase(async (db) => {
      await db.arrange(
        "update auditor_profile set approval_status = 'pending' where user_id = $1",
        [ids.otherAuditor],
      );

      const vetting = (await queue(db, ids.admin)).filter((i) => i.kind === 'vetting');
      // A cockpit for two people: one line saying "2 waiting", not two lines.
      expect(vetting).toHaveLength(1);
      expect(vetting[0]?.summary).toMatch(/1 auditor application waiting/);
    });
  });

  it('flags a write-up that is late', async () => {
    await withDatabase(async (db) => {
      await db.arrange(
        `insert into audit (client_organisation_id, auditor_id, status, postcode,
                            window_start_on, window_end_on)
         values ($1, $2, 'assigned', 'CR0 1AA', current_date - 10, current_date - 5)`,
        [ids.charityA, ids.auditor],
      );

      const item = (await queue(db, ids.admin)).find((i) => i.kind === 'stale_write_up');
      expect(item?.summary).toMatch(/write-up due 48 hours after the shift/);
    });
  });

  it('drops an audit out of the queue once it is released', async () => {
    await withDatabase(async (db) => {
      const [audit] = await db.arrange<{ id: string; reference: string }>(
        `insert into audit (client_organisation_id, auditor_id, status, postcode,
                            window_start_on, window_end_on, submitted_at)
         values ($1, $2, 'in_review', 'SE22 9AA', current_date - 3, current_date - 1, now())
         returning id, reference`,
        [ids.charityA, ids.auditor],
      );

      const held = await queue(db, ids.admin);
      expect(held.map((i) => i.reference)).toContain(audit?.reference);

      await db.arrange("update audit set status = 'released', released_at = now() where id = $1", [
        audit?.id,
      ]);

      const after = await queue(db, ids.admin);
      expect(after.map((i) => i.reference)).not.toContain(audit?.reference);
    });
  });
});

describe('ops_counters', () => {
  it('gives four numbers and only to an admin', async () => {
    await withDatabase(async (db) => {
      const [counters] = await db
        .as(ids.admin)
        .query<Record<string, number>>('select * from ops_counters()');
      expect(Object.keys(counters ?? {})).toEqual([
        'needs_a_human',
        'in_flight_today',
        'offers_awaiting',
        'released_this_week',
      ]);

      expect(await db.as(ids.clientA).query('select * from ops_counters()')).toEqual([]);
    });
  });

  it('counts what needs a human as the length of the queue', async () => {
    await withDatabase(async (db) => {
      await db.arrange(
        `insert into complaint (organisation_id, subject, body, raised_by)
         values ($1, 'about_fundraiser', 'Something', $2)`,
        [ids.charityA, ids.clientA],
      );

      const [counters] = await db
        .as(ids.admin)
        .query<{ needs_a_human: number }>('select * from ops_counters()');
      const items = await queue(db, ids.admin);
      expect(Number(counters?.needs_a_human)).toBe(items.length);
    });
  });
});
