import { beforeEach, describe, expect, it } from 'vitest';
import { type Harness, ids, withDatabase } from './rls';

/**
 * TND-92 — accepting an invitation.
 *
 * The rule worth guarding is the one an attacker would go for: completing your
 * own profile makes you *visible to vetting*, never approved by it. Everything
 * else here is ordinary input validation; the `approval_status` test is the
 * feature's security boundary.
 */

/** Someone PICK has invited who has not yet turned up. */
const INVITEE = '00000000-0000-7000-8000-0000000e0009';

async function invite(db: Harness) {
  await db.arrange(
    `insert into auth.users (id, email, instance_id, aud, role) values
       ($1, 'new@pick.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')`,
    [INVITEE],
  );
  await db.arrange(
    `insert into user_profile (id, role, full_name, email, status, invited_by)
     values ($1, 'auditor', '', 'new@pick.test', 'invited', $2)`,
    [INVITEE, ids.admin],
  );
  await db.arrange(
    `insert into auditor_profile (user_id, approval_status) values ($1, 'pending')`,
    [INVITEE],
  );
}

const COMPLETE = `select * from complete_auditor_profile($1, $2, $3, $4, $5)`;
const DETAILS: unknown[] = ['Dana Okoro', 'SW1A 1AA', ['SW', 'EC'], ['street'], false];

describe('accepting an invitation', () => {
  it('puts a new auditor in front of vetting, and no further', async () => {
    // The whole point of the feature: someone who was nowhere is now in the
    // queue S4.3 already knows how to show.
    await withDatabase(async (db) => {
      await invite(db);
      await db.as(INVITEE).query(COMPLETE, DETAILS);

      const [profile] = await db.arrange<{ approval_status: string; base_postcode: string }>(
        'select approval_status, base_postcode from auditor_profile where user_id = $1',
        [INVITEE],
      );
      expect(profile?.approval_status).toBe('pending');
      expect(profile?.base_postcode).toBe('SW1A 1AA');

      const [user] = await db.arrange<{ status: string; full_name: string }>(
        'select status, full_name from user_profile where id = $1',
        [INVITEE],
      );
      expect(user?.status).toBe('active');
      expect(user?.full_name).toBe('Dana Okoro');
    });
  });

  it('does not let an auditor approve themselves', async () => {
    // The reason `complete_auditor_profile` never writes approval_status.
    // Anyone holding an invite link could otherwise put themselves on the
    // roster and start being offered real charities' audits.
    //
    // Asserted as "the value did not move", NOT as a refusal: RLS filters an
    // UPDATE rather than raising on it, so the statement below succeeds and
    // reports `UPDATE 0`. A test expecting an error here would pass only if
    // something else went wrong, and would keep passing if the policy were
    // deleted tomorrow.
    await withDatabase(async (db) => {
      await invite(db);
      await db.as(INVITEE).query(COMPLETE, DETAILS);

      await db
        .as(INVITEE)
        .query("update auditor_profile set approval_status = 'approved' where user_id = $1", [
          INVITEE,
        ]);

      const [profile] = await db.arrange<{ approval_status: string }>(
        'select approval_status from auditor_profile where user_id = $1',
        [INVITEE],
      );
      expect(profile?.approval_status).toBe('pending');
    });
  });

  it('records who invited them', async () => {
    // A network of contractors vouched for by nobody is not a defensible
    // position later. Cheap to keep now, impossible to reconstruct after.
    await withDatabase(async (db) => {
      await invite(db);
      const [user] = await db.arrange<{ invited_by: string }>(
        'select invited_by from user_profile where id = $1',
        [INVITEE],
      );
      expect(user?.invited_by).toBe(ids.admin);
    });
  });

  it('cannot be used twice', async () => {
    // Coverage decides which audits reach an auditor. If accepting stayed
    // open, that would be quietly self-editable with no trace.
    await withDatabase(async (db) => {
      await invite(db);
      await db.as(INVITEE).query(COMPLETE, DETAILS);
      const message = await db.as(INVITEE).expectRefused(COMPLETE, DETAILS);
      expect(message).toMatch(/already been used/i);
    });
  });

  it('refuses one auditor completing on another one’s behalf', async () => {
    await withDatabase(async (db) => {
      await invite(db);
      // The function takes no id, so there is nothing to pass — the only way
      // to try is to call it as someone else, which changes nothing for them.
      const message = await db.as(ids.auditor).expectRefused(COMPLETE, DETAILS);
      expect(message).toMatch(/already been used|not yours/i);

      const [user] = await db.arrange<{ status: string }>(
        'select status from user_profile where id = $1',
        [INVITEE],
      );
      expect(user?.status).toBe('invited');
    });
  });

  it('refuses a client and an admin outright', async () => {
    await withDatabase(async (db) => {
      await invite(db);
      await db.as(ids.clientA).expectRefused(COMPLETE, DETAILS);
      await db.as(ids.admin).expectRefused(COMPLETE, DETAILS);
    });
  });

  it('refuses anon', async () => {
    await withDatabase(async (db) => {
      await invite(db);
      await db.as(null).expectRefused(COMPLETE, DETAILS);
    });
  });
});

describe('what an auditor has to tell us', () => {
  let details: unknown[];
  beforeEach(() => {
    details = [...DETAILS];
  });

  it('insists on somewhere to work', async () => {
    await withDatabase(async (db) => {
      await invite(db);
      details[2] = [];
      const message = await db.as(INVITEE).expectRefused(COMPLETE, details);
      expect(message).toMatch(/at least one postcode area/i);
    });
  });

  it('insists on something to run', async () => {
    await withDatabase(async (db) => {
      await invite(db);
      details[3] = [];
      const message = await db.as(INVITEE).expectRefused(COMPLETE, details);
      expect(message).toMatch(/at least one kind of audit/i);
    });
  });

  it('insists on a name to put on the roster', async () => {
    await withDatabase(async (db) => {
      await invite(db);
      details[0] = '   ';
      const message = await db.as(INVITEE).expectRefused(COMPLETE, details);
      expect(message).toMatch(/name/i);
    });
  });

  it('rejects a full postcode where an area belongs, and says which', async () => {
    // Matching joins on area letters. A district here would silently match
    // nothing, and the auditor would simply never be offered work.
    await withDatabase(async (db) => {
      await invite(db);
      details[2] = ['SW1A'];
      const message = await db.as(INVITEE).expectRefused(COMPLETE, details);
      expect(message).toMatch(/SW1A/);
      expect(message).toMatch(/letters only/i);
    });
  });

  it('stores areas uppercased, so matching is not case-sensitive', async () => {
    await withDatabase(async (db) => {
      await invite(db);
      details[2] = ['sw', 'ec'];
      await db.as(INVITEE).query(COMPLETE, details);

      const areas = await db.arrange<{ postcode_area: string }>(
        'select postcode_area from auditor_coverage where auditor_id = $1 order by postcode_area',
        [INVITEE],
      );
      expect(areas.map((a) => a.postcode_area)).toEqual(['EC', 'SW']);
    });
  });
});
