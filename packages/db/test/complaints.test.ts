import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

const raise = (subject: string, auditId: string | null, body: string) => ({
  sql: `insert into complaint (organisation_id, audit_id, subject, body, raised_by)
        values ($1, $2, $3, $4, $5) returning id, status`,
  params: [ids.charityA, auditId, subject, body, ids.clientA],
});

describe('complaints (S3.6)', () => {
  it('lets a charity raise one about an audit', async () => {
    await withDatabase(async (db) => {
      const { sql, params } = raise('about_audit', ids.auditA, 'The pitch finding is wrong');
      const [row] = await db.as(ids.clientA).query<{ status: string }>(sql, params);
      expect(row?.status).toBe('open');
    });
  });

  it('lets a charity raise one about a fundraiser without naming an audit', async () => {
    await withDatabase(async (db) => {
      const { sql, params } = raise('about_fundraiser', null, 'Fundraiser followed someone');
      const [row] = await db.as(ids.clientA).query<{ status: string }>(sql, params);
      expect(row?.status).toBe('open');
    });
  });

  it('insists an audit complaint names the audit', async () => {
    await withDatabase(async (db) => {
      const { sql, params } = raise('about_audit', null, 'Something was wrong');
      const message = await db.as(ids.clientA).expectRefused(sql, params);
      expect(message).toMatch(/audit_complaint_names_the_audit|check constraint/i);
    });
  });

  it('refuses an empty complaint', async () => {
    await withDatabase(async (db) => {
      const { sql, params } = raise('about_fundraiser', null, '   ');
      const message = await db.as(ids.clientA).expectRefused(sql, params);
      expect(message).toMatch(/body_not_empty|check constraint/i);
    });
  });

  it("keeps one charity's complaints away from another", async () => {
    await withDatabase(async (db) => {
      const { sql, params } = raise('about_fundraiser', null, 'Private matter');
      const [raised] = await db.as(ids.clientA).query<{ id: string }>(sql, params);

      // Asserted by membership, not count: a complaint raised through the UX
      // suite lives in the same database and must not fail this.
      const theirs = await db.as(ids.clientB).query<{ id: string }>('select id from complaint');
      expect(theirs.map((c) => c.id)).not.toContain(raised?.id);

      const admin = await db.as(ids.admin).query<{ id: string }>('select id from complaint');
      expect(admin.map((c) => c.id)).toContain(raised?.id);
    });
  });

  it("will not let a charity raise one in another charity's name", async () => {
    await withDatabase(async (db) => {
      const message = await db.as(ids.clientA).expectRefused(
        `insert into complaint (organisation_id, subject, body, raised_by)
         values ($1, 'about_fundraiser', 'Not mine', $2)`,
        [ids.charityB, ids.clientA],
      );
      expect(message).toMatch(/row-level security/i);
    });
  });

  it('will not let a charity resolve its own complaint', async () => {
    await withDatabase(async (db) => {
      const { sql, params } = raise('about_fundraiser', null, 'Please look at this');
      await db.as(ids.clientA).query(sql, params);

      // Marking your own complaint resolved would make the record meaningless.
      await db.as(ids.clientA).query("update complaint set status = 'resolved'");
      const [row] = await db.arrange<{ status: string }>('select status from complaint');
      expect(row?.status).toBe('open');
    });
  });

  it('lets PICK move it along', async () => {
    await withDatabase(async (db) => {
      const { sql, params } = raise('about_audit', ids.auditA, 'Disputed finding');
      await db.as(ids.clientA).query(sql, params);

      await db
        .as(ids.admin)
        .query("update complaint set status = 'resolved', resolved_at = now(), resolution = $1", [
          'Report corrected',
        ]);
      const [row] = await db.arrange<{ status: string; resolution: string }>(
        'select status, resolution from complaint',
      );
      expect(row?.status).toBe('resolved');
      expect(row?.resolution).toBe('Report corrected');
    });
  });
});
