import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

/**
 * The review gate functions are `security definer`, so RLS does not apply
 * inside them. That is the point — they read `review_gate`, which is
 * admin-only, and `audit` rows across tenants. It also means the guard has to
 * be written by hand, and for a while it was not there at all.
 *
 * These tests exist because the leak was invisible from every other angle:
 * the tables were correctly locked down, the policies passed their own tests,
 * and the functions had `revoke ... from public, anon` on them, which reads
 * like a permission check without being one. `authenticated` is one role
 * shared by every signed-in user, so granting it is granting everybody.
 */

describe('who can read review gate state', () => {
  it('does not let an auditor read gate state for an audit that is not theirs', async () => {
    // Charity B's audit. This auditor gets zero rows for it through RLS, and
    // the security definer function must not be a way around that.
    await withDatabase(async (db) => {
      const rows = await db
        .as(ids.auditor)
        .query('select * from audit_gate_state($1)', [ids.auditB]);

      expect(rows).toHaveLength(0);
    });
  });

  it('does not tell an auditor why an audit they cannot see is held', async () => {
    // The reasons are the worst of it: they name another charity's trading
    // history, another auditor's completed count, and the number of open
    // risks on an assignment.
    await withDatabase(async (db) => {
      const rows = await db
        .as(ids.auditor)
        .query('select * from matching_review_gates($1)', [ids.auditB]);

      expect(rows).toHaveLength(0);
    });
  });

  it('does not leak the same reasons through the text wrapper', async () => {
    // `review_gate_reason` is a one-line convenience over the function above
    // and had no revoke of its own, so it kept EXECUTE for PUBLIC.
    await withDatabase(async (db) => {
      const [row] = await db
        .as(ids.auditor)
        .query<{ review_gate_reason: string | null }>('select review_gate_reason($1)', [
          ids.auditB,
        ]);

      expect(row?.review_gate_reason).toBeNull();
    });
  });

  it('does not let a charity read gate state for another charity', async () => {
    // Same hole, the other kind of tenant. A client learning that a rival's
    // audit is held is no better than an auditor learning it.
    await withDatabase(async (db) => {
      const rows = await db
        .as(ids.clientA)
        .query('select * from audit_gate_state($1)', [ids.auditB]);

      expect(rows).toHaveLength(0);
    });
  });

  it('does not let a charity read gate state for its own audit either', async () => {
    // Deliberate. Whether PICK is holding a report, and why, is review
    // activity — a charity that could watch its own gates would learn which
    // auditors are new and which of its own audits was flagged manually.
    await withDatabase(async (db) => {
      const rows = await db
        .as(ids.clientA)
        .query('select * from audit_gate_state($1)', [ids.auditA]);

      expect(rows).toHaveLength(0);
    });
  });

  it('still gives PICK admin what the review screen needs', async () => {
    // The guard has to stop the leak without breaking the one caller that is
    // supposed to work.
    await withDatabase(async (db) => {
      const rows = await db
        .as(ids.admin)
        .query<{ payment: string; client_release: string }>('select * from audit_gate_state($1)', [
          ids.auditB,
        ]);

      expect(rows).toHaveLength(1);
      expect(rows[0]?.payment).toBeTruthy();
      expect(rows[0]?.client_release).toBeTruthy();
    });
  });

  it('still gives PICK admin the reasons behind a hold', async () => {
    await withDatabase(async (db) => {
      const rows = await db
        .as(ids.admin)
        .query('select * from matching_review_gates($1)', [ids.auditB]);

      expect(rows.length).toBeGreaterThan(0);
    });
  });
});
