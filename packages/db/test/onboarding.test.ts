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

const COMPLETE = `select * from complete_auditor_profile($1, $2, $3, $4, $5, $6, $7)`;

/**
 * An auditor says where they set out from, how far they will travel and how,
 * and the places they confirmed — never a postcode area. The place ids are
 * looked up per test because the gazetteer is seeded by migration.
 */
async function details(db: Harness, over: Partial<{ places: string[]; types: string[] }> = {}) {
  const [base] = await db.arrange<{ id: string }>(
    "select id from place where name = 'Westminster' and country_code = 'GB'",
  );
  const names = over.places ?? ['Westminster', 'Southwark'];
  const places = await db.arrange<{ id: string }>(
    'select id from place where name = any($1) and country_code = $2',
    [names, 'GB'],
  );
  return [
    'Dana Okoro',
    base?.id,
    45,
    'own_vehicle',
    places.map((p) => p.id),
    over.types ?? ['street'],
    false,
  ];
}

describe('accepting an invitation', () => {
  it('puts a new auditor in front of vetting, and no further', async () => {
    // The whole point of the feature: someone who was nowhere is now in the
    // queue S4.3 already knows how to show.
    await withDatabase(async (db) => {
      await invite(db);
      await db.as(INVITEE).query(COMPLETE, await details(db));

      const [profile] = await db.arrange<{ approval_status: string; base_place: string }>(
        `select ap.approval_status, p.name as base_place
         from auditor_profile ap join place p on p.id = ap.base_place_id
         where ap.user_id = $1`,
        [INVITEE],
      );
      expect(profile?.approval_status).toBe('pending');
      expect(profile?.base_place).toBe('Westminster');

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
      await db.as(INVITEE).query(COMPLETE, await details(db));

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
      await db.as(INVITEE).query(COMPLETE, await details(db));
      const message = await db.as(INVITEE).expectRefused(COMPLETE, await details(db));
      expect(message).toMatch(/already been used/i);
    });
  });

  it('refuses one auditor completing on another one’s behalf', async () => {
    await withDatabase(async (db) => {
      await invite(db);
      // The function takes no id, so there is nothing to pass — the only way
      // to try is to call it as someone else, which changes nothing for them.
      const message = await db.as(ids.auditor).expectRefused(COMPLETE, await details(db));
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
      await db.as(ids.clientA).expectRefused(COMPLETE, await details(db));
      await db.as(ids.admin).expectRefused(COMPLETE, await details(db));
    });
  });

  it('refuses anon', async () => {
    await withDatabase(async (db) => {
      await invite(db);
      await db.as(null).expectRefused(COMPLETE, await details(db));
    });
  });
});

describe('what an auditor has to tell us', () => {
  it('insists on somewhere to work', async () => {
    await withDatabase(async (db) => {
      await invite(db);
      const args = await details(db);
      args[4] = [];
      const message = await db.as(INVITEE).expectRefused(COMPLETE, args);
      expect(message).toMatch(/at least one place/i);
    });
  });

  it('insists on something to run', async () => {
    await withDatabase(async (db) => {
      await invite(db);
      const args = await details(db);
      args[5] = [];
      const message = await db.as(INVITEE).expectRefused(COMPLETE, args);
      expect(message).toMatch(/at least one kind of audit/i);
    });
  });

  it('insists on a name to put on the roster', async () => {
    await withDatabase(async (db) => {
      await invite(db);
      const args = await details(db);
      args[0] = '   ';
      const message = await db.as(INVITEE).expectRefused(COMPLETE, args);
      expect(message).toMatch(/name/i);
    });
  });

  it('insists on knowing where they set out from', async () => {
    // Without an origin there is nothing to derive coverage from, and no way
    // to tell them how far anything is.
    await withDatabase(async (db) => {
      await invite(db);
      const args = await details(db);
      args[1] = null;
      const message = await db.as(INVITEE).expectRefused(COMPLETE, args);
      expect(message).toMatch(/where you set out from/i);
    });
  });

  it('records the places they confirmed, not a postcode', async () => {
    await withDatabase(async (db) => {
      await invite(db);
      await db.as(INVITEE).query(COMPLETE, await details(db));

      const places = await db.arrange<{ name: string }>(
        `select p.name from auditor_coverage c
         join place p on p.id = c.place_id
         where c.auditor_id = $1 and c.source <> 'excluded'
         order by p.name`,
        [INVITEE],
      );
      expect(places.map((p) => p.name)).toEqual(['Southwark', 'Westminster']);
    });
  });

  it('keeps how far they said they would travel, as they said it', async () => {
    // The straight-line radius is derived from this, never stored in its
    // place — so real journey times can replace the estimate later without
    // asking anybody again.
    await withDatabase(async (db) => {
      await invite(db);
      await db.as(INVITEE).query(COMPLETE, await details(db));

      const [profile] = await db.arrange<{ max_travel_minutes: number; travel_mode: string }>(
        'select max_travel_minutes, travel_mode from auditor_profile where user_id = $1',
        [INVITEE],
      );
      expect(profile?.max_travel_minutes).toBe(45);
      expect(profile?.travel_mode).toBe('own_vehicle');
    });
  });
});

describe('the roster tells vetting from waiting', () => {
  it('does not count an unopened invitation as somebody to vet', async () => {
    // The ops queue points at this number. Counting invitations would send
    // someone to a queue with nothing in it they can act on.
    await withDatabase(async (db) => {
      await invite(db);

      const roster = await db
        .as(ids.admin)
        .query<{ auditor_id: string; user_status: string; approval_status: string }>(
          'select auditor_id, user_status, approval_status from auditor_roster()',
        );

      const waiting = roster.find((r) => r.auditor_id === INVITEE);
      expect(waiting?.user_status).toBe('invited');
      expect(waiting?.approval_status).toBe('pending');

      const vettable = roster.filter(
        (r) => r.user_status !== 'invited' && r.approval_status === 'pending',
      );
      expect(vettable.map((r) => r.auditor_id)).not.toContain(INVITEE);
    });
  });

  it('moves them into the vetting queue once they accept', async () => {
    await withDatabase(async (db) => {
      await invite(db);
      await db.as(INVITEE).query(COMPLETE, await details(db));

      const roster = await db
        .as(ids.admin)
        .query<{ auditor_id: string; user_status: string; approval_status: string }>(
          'select auditor_id, user_status, approval_status from auditor_roster()',
        );

      const now = roster.find((r) => r.auditor_id === INVITEE);
      expect(now?.user_status).toBe('active');
      expect(now?.approval_status).toBe('pending');
    });
  });

  it('shows the roster to nobody but PICK', async () => {
    await withDatabase(async (db) => {
      await invite(db);
      expect(await db.as(INVITEE).query('select * from auditor_roster()')).toHaveLength(0);
      expect(await db.as(ids.clientA).query('select * from auditor_roster()')).toHaveLength(0);
    });
  });
});
