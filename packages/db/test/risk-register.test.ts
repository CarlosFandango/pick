import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

type Db = Awaited<Parameters<Parameters<typeof withDatabase>[0]>[0]>;

const AUDIT = '00000000-0000-7000-8000-0000000a000a';

/** A booked audit and a completed one for the same charity, same auditor. */
async function arrangeFamiliarity(db: Db) {
  await db.arrange(
    `insert into audit (id, client_organisation_id, status, audit_type, postcode,
                        window_start_on, window_end_on)
     values ($1, $2, 'booked', 'street', 'SW1A 1AA', current_date + 7, current_date + 10)`,
    [AUDIT, ids.charityA],
  );
  await db.arrange(
    `insert into audit (client_organisation_id, auditor_id, status, audit_type, postcode,
                        window_start_on, window_end_on, completed_at)
     values ($1, $2, 'released', 'street', 'SW1A 1AA', current_date - 20, current_date - 18, now() - interval '10 days')`,
    [ids.charityA, ids.auditor],
  );
}

const codeFor = async (db: Db, auditor: string) => {
  const [row] = await db.arrange<{ code: string }>('select auditor_code_for($1, $2) as code', [
    auditor,
    ids.charityA,
  ]);
  return row?.code as string;
};

describe('overriding the assignment', () => {
  it('hard-blocks a conflict, which is not the client’s to waive', async () => {
    // A hand-picked auditor they have a relationship with is not defensible to
    // a regulator regardless of how comfortable the client is with it. There
    // is deliberately no parameter that proceeds anyway.
    await withDatabase(async (db) => {
      await arrangeFamiliarity(db);
      await db.arrange(
        'insert into auditor_conflict (auditor_id, organisation_id, reason) values ($1, $2, $3)',
        [ids.auditor, ids.charityA, 'former colleague'],
      );

      const message = await db
        .as(ids.clientA)
        .expectRefused('select prefer_auditor($1, $2)', [AUDIT, await codeFor(db, ids.auditor)]);
      expect(message).toMatch(/declared conflict/i);
    });
  });

  it('allows an exposure override and raises a risk against it', async () => {
    await withDatabase(async (db) => {
      await arrangeFamiliarity(db);
      await db
        .as(ids.clientA)
        .query('select prefer_auditor($1, $2)', [AUDIT, await codeFor(db, ids.auditor)]);

      const risks = await db.arrange<{ type: string; status: string; detail: string }>(
        "select type, status, detail from risk where subject_type = 'assignment' and subject_id = $1",
        [AUDIT],
      );

      expect(risks).toHaveLength(1);
      expect(risks[0]?.type).toBe('exposure');
      expect(risks[0]?.status).toBe('open');
      expect(risks[0]?.detail).toMatch(/recognisable/i);
    });
  });

  it('records every override, risk or not — the pattern is the signal', async () => {
    // A client repeatedly steering toward the same auditor is the reciprocity
    // pattern the conflict policy exists to catch, and it is only visible if
    // every override is written down.
    await withDatabase(async (db) => {
      await arrangeFamiliarity(db);
      await db
        .as(ids.clientA)
        .query('select prefer_auditor($1, $2)', [AUDIT, await codeFor(db, ids.auditor)]);

      const [override] = await db.arrange<{ overridden_by: string; risk_id: string | null }>(
        'select overridden_by, risk_id from assignment_override where audit_id = $1',
        [AUDIT],
      );

      expect(override?.overridden_by).toBe(ids.clientA);
      expect(override?.risk_id).not.toBeNull();
    });
  });

  it('raises no risk when the auditor has not seen this charity', async () => {
    await withDatabase(async (db) => {
      await db.arrange(
        `insert into audit (id, client_organisation_id, status, audit_type, postcode,
                            window_start_on, window_end_on)
         values ($1, $2, 'booked', 'street', 'SW1A 1AA', current_date + 7, current_date + 10)`,
        [AUDIT, ids.charityA],
      );

      await db
        .as(ids.clientA)
        .query('select prefer_auditor($1, $2)', [AUDIT, await codeFor(db, ids.otherAuditor)]);

      const risks = await db.arrange(
        "select id from risk where subject_type = 'assignment' and subject_id = $1",
        [AUDIT],
      );
      expect(risks).toHaveLength(0);
    });
  });
});

describe('advising on a risk', () => {
  it('moves it from open to advised, with its own timestamp and owner', async () => {
    // A flag nobody acted on is not evidence of anything. The advisory is the
    // half that makes the register defensible.
    await withDatabase(async (db) => {
      const [risk] = await db.arrange<{ id: string }>(
        `insert into risk (type, subject_type, subject_id, detail, organisation_id)
         values ('exposure', 'assignment', $1, 'seen recently', $2) returning id`,
        [AUDIT, ids.charityA],
      );

      await db
        .as(ids.admin)
        .query('select advise_on_risk($1, $2)', [risk?.id, 'Told them by email, they proceeded']);

      const [after] = await db.arrange<{ status: string }>(
        'select status from risk where id = $1',
        [risk?.id],
      );
      const [advisory] = await db.arrange<{ advised_by: string; content: string }>(
        'select advised_by, content from risk_advisory where risk_id = $1',
        [risk?.id],
      );

      expect(after?.status).toBe('advised');
      expect(advisory?.advised_by).toBe(ids.admin);
      expect(advisory?.content).toMatch(/proceeded/);
    });
  });

  it('will not record an advisory that says nothing', async () => {
    await withDatabase(async (db) => {
      const [risk] = await db.arrange<{ id: string }>(
        `insert into risk (type, subject_type, subject_id, detail)
         values ('quality', 'auditor', $1, 'x') returning id`,
        [ids.auditor],
      );

      const message = await db
        .as(ids.admin)
        .expectRefused('select advise_on_risk($1, $2)', [risk?.id, '   ']);
      expect(message).toMatch(/what the client was told/i);
    });
  });

  it('is PICK-only, both the register and the advisories', async () => {
    // A charity being advised of a risk hears it from a person, not from a
    // table they can browse.
    await withDatabase(async (db) => {
      await db.arrange(
        `insert into risk (type, subject_type, subject_id, detail, organisation_id)
         values ('exposure', 'assignment', $1, 'seen recently', $2)`,
        [AUDIT, ids.charityA],
      );

      expect(await db.as(ids.clientA).query('select id from risk')).toHaveLength(0);
      expect(await db.as(ids.auditor).query('select id from risk')).toHaveLength(0);
      expect((await db.as(ids.admin).query('select id from risk')).length).toBeGreaterThan(0);
    });
  });
});
