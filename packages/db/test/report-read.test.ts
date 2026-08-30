import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

/**
 * A read receipt on a released report.
 *
 * The audit list's "ready for you" group turns on this, so the rules that
 * matter are who can set it, and that it records the FIRST open rather than
 * the most recent one.
 */
const RELEASED = '00000000-0000-7000-8000-0000000a0f01';

/**
 * A released audit belonging to charity A. Arranged here rather than added to
 * the shared fixture: other suites count the audits they can see, and a third
 * one appearing globally would change what they assert without saying why.
 */
const arrangeReleased = async (db: Awaited<Parameters<Parameters<typeof withDatabase>[0]>[0]>) => {
  await db.arrange(
    `insert into audit (id, client_organisation_id, auditor_id, status, postcode, place_id)
     values ($1, $2, $3, 'released', 'SW1A 1AA',
             (select id from place where name = 'Westminster' and country_code = 'GB'))`,
    [RELEASED, ids.charityA, ids.auditor],
  );
};

const readAt = async (
  db: Awaited<Parameters<Parameters<typeof withDatabase>[0]>[0]>,
  auditId: string,
) => {
  // pg hands back a Date; compared as a string so two equal instants are equal.
  const [row] = await db.arrange<{ report_read_at: Date | null }>(
    'select report_read_at from audit where id = $1',
    [auditId],
  );
  return row?.report_read_at ? row.report_read_at.toISOString() : null;
};

describe('when a charity opened a report', () => {
  it('is recorded when the charity that paid for it opens it', async () => {
    await withDatabase(async (db) => {
      await arrangeReleased(db);
      await db.as(ids.clientA).query('select mark_report_read($1)', [RELEASED]);
      expect(await readAt(db, RELEASED)).not.toBeNull();
    });
  });

  it('keeps the first open, so "read on 20 July" stays true', async () => {
    await withDatabase(async (db) => {
      await arrangeReleased(db);
      await db.as(ids.clientA).query('select mark_report_read($1)', [RELEASED]);
      const first = await readAt(db, RELEASED);
      await db.as(ids.clientA).query('select mark_report_read($1)', [RELEASED]);
      expect(await readAt(db, RELEASED)).toBe(first);
    });
  });

  it('is not set by another charity', async () => {
    await withDatabase(async (db) => {
      await arrangeReleased(db);
      await db.as(ids.clientB).query('select mark_report_read($1)', [RELEASED]);
      expect(await readAt(db, RELEASED)).toBeNull();
    });
  });

  it('is not set by an admin, who is not the charity reading it', async () => {
    await withDatabase(async (db) => {
      await arrangeReleased(db);
      await db.as(ids.admin).query('select mark_report_read($1)', [RELEASED]);
      expect(await readAt(db, RELEASED)).toBeNull();
    });
  });

  it('is not set by the auditor who ran it', async () => {
    await withDatabase(async (db) => {
      await arrangeReleased(db);
      await db.as(ids.auditor).query('select mark_report_read($1)', [RELEASED]);
      expect(await readAt(db, RELEASED)).toBeNull();
    });
  });

  it('does nothing for an audit with no report yet', async () => {
    await withDatabase(async (db) => {
      await db.as(ids.clientA).query('select mark_report_read($1)', [ids.auditA]);
      expect(await readAt(db, ids.auditA)).toBeNull();
    });
  });
});
