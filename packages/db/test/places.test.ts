import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

/**
 * Coverage is places now, not postcode areas.
 *
 * The rules worth pinning are the ones that make this work outside the UK, and
 * the one that keeps matching cheap: the circle only ever proposes, and what
 * gets stored is what the auditor confirmed.
 */

const placeId = async (
  db: Awaited<Parameters<Parameters<typeof withDatabase>[0]>[0]>,
  name: string,
) => {
  const [row] = await db.arrange<{ id: string }>('select id from place where name = $1', [name]);
  return row?.id as string;
};

describe('the gazetteer', () => {
  it('holds somewhere with no postcode areas at all', async () => {
    // Ireland has no postcode areas. If a Dublin audit can be described and
    // matched, the model is genuinely about places rather than postcodes
    // wearing a different name.
    await withDatabase(async (db) => {
      const [dublin] = await db
        .as(ids.admin)
        .query<{ name: string; country_code: string }>(
          "select name, country_code from place where name = 'Dublin'",
        );
      expect(dublin?.country_code).toBe('IE');
    });
  });

  it('is readable by anyone signed in, because both sides of the market need it', async () => {
    await withDatabase(async (db) => {
      for (const who of [ids.admin, ids.clientA, ids.auditor]) {
        const rows = await db.as(who).query('select id from place limit 1');
        expect(rows).toHaveLength(1);
      }
    });
  });

  it('tells two places of the same name apart by region', async () => {
    await withDatabase(async (db) => {
      const rows = await db.arrange<{ region: string }>(
        "select region from place where name = 'Newport'",
      );
      expect(rows[0]?.region).toBeTruthy();
    });
  });
});

describe('how far somebody will travel', () => {
  it('reaches further by car than by bus, for the same minutes', async () => {
    await withDatabase(async (db) => {
      const manchester = await placeId(db, 'Manchester');
      const byCar = await db
        .as(ids.auditor)
        .query('select * from places_within_reach($1, 45, $2)', [manchester, 'own_vehicle']);
      const byBus = await db
        .as(ids.auditor)
        .query('select * from places_within_reach($1, 45, $2)', [manchester, 'public_transport']);

      expect(byCar.length).toBeGreaterThan(byBus.length);
    });
  });

  it('puts the nearest places first, with a rough time on each', async () => {
    await withDatabase(async (db) => {
      const manchester = await placeId(db, 'Manchester');
      const rows = await db
        .as(ids.auditor)
        .query<{ name: string; minutes: number }>('select * from places_within_reach($1, 45, $2)', [
          manchester,
          'own_vehicle',
        ]);

      expect(rows[0]?.name).toBe('Manchester');
      expect(rows.map((r) => r.minutes)).toEqual(
        [...rows.map((r) => r.minutes)].sort((a, b) => a - b),
      );
      // Salford is the next borough. Anything over ten minutes would mean the
      // estimate is wrong in a way an auditor would notice immediately.
      expect(rows.find((r) => r.name === 'Salford')?.minutes).toBeLessThan(10);
    });
  });

  it('does not offer places in another country', async () => {
    // Dublin is closer to Manchester than Aberdeen is, and it is a ferry away.
    // Crossing a border is a different journey, and until routing knows that,
    // the country is the honest boundary.
    await withDatabase(async (db) => {
      const manchester = await placeId(db, 'Manchester');
      const rows = await db
        .as(ids.auditor)
        .query<{ name: string }>('select * from places_within_reach($1, 240, $2)', [
          manchester,
          'own_vehicle',
        ]);
      expect(rows.map((r) => r.name)).not.toContain('Dublin');
    });
  });
});

describe('saving where an auditor works', () => {
  const save = 'select set_auditor_coverage($1, $2, $3, $4, $5)';

  it('stores what they confirmed, not what the circle proposed', async () => {
    await withDatabase(async (db) => {
      const [manchester, salford] = [await placeId(db, 'Manchester'), await placeId(db, 'Salford')];

      await db
        .as(ids.auditor)
        .query(save, [manchester, 45, 'own_vehicle', [manchester, salford], []]);

      const kept = await db.arrange<{ name: string }>(
        `select p.name from auditor_coverage c join place p on p.id = c.place_id
         where c.auditor_id = $1 and c.source <> 'excluded' order by p.name`,
        [ids.auditor],
      );
      expect(kept.map((k) => k.name)).toEqual(['Manchester', 'Salford']);
    });
  });

  it('remembers a place they took off the list', async () => {
    // Re-deriving after somebody moves house must not quietly undo their
    // correction, so an unticked place is a row rather than an absence.
    await withDatabase(async (db) => {
      const [manchester, rochdale] = [
        await placeId(db, 'Manchester'),
        await placeId(db, 'Rochdale'),
      ];

      await db
        .as(ids.auditor)
        .query(save, [manchester, 45, 'own_vehicle', [manchester], [rochdale]]);

      const [excluded] = await db.arrange<{ name: string }>(
        `select p.name from auditor_coverage c join place p on p.id = c.place_id
         where c.auditor_id = $1 and c.source = 'excluded'`,
        [ids.auditor],
      );
      expect(excluded?.name).toBe('Rochdale');
    });
  });

  it('never offers an audit in a place they excluded', async () => {
    await withDatabase(async (db) => {
      const westminster = await placeId(db, 'Westminster');
      await db.arrange('delete from auditor_coverage where auditor_id = $1 and place_id = $2', [
        ids.auditor,
        westminster,
      ]);
      await db.arrange(
        "insert into auditor_coverage (auditor_id, place_id, source) values ($1, $2, 'excluded')",
        [ids.auditor, westminster],
      );
      await db.arrange(
        "insert into auditor_capability (auditor_id, audit_type) values ($1, 'street') on conflict do nothing",
        [ids.auditor],
      );

      const rows = await db
        .as(ids.admin)
        .query<{ auditor_id: string }>('select * from eligible_auditors($1)', [ids.auditA]);
      expect(rows.map((r) => r.auditor_id)).not.toContain(ids.auditor);
    });
  });

  it('keeps how far they said they would travel, as they said it', async () => {
    await withDatabase(async (db) => {
      const manchester = await placeId(db, 'Manchester');
      await db.as(ids.auditor).query(save, [manchester, 90, 'public_transport', [manchester], []]);

      const [profile] = await db.arrange<{ max_travel_minutes: number; travel_mode: string }>(
        'select max_travel_minutes, travel_mode from auditor_profile where user_id = $1',
        [ids.auditor],
      );
      expect(profile?.max_travel_minutes).toBe(90);
      expect(profile?.travel_mode).toBe('public_transport');
    });
  });

  it('refuses an auditor who says they work nowhere', async () => {
    await withDatabase(async (db) => {
      const manchester = await placeId(db, 'Manchester');
      const message = await db
        .as(ids.auditor)
        .expectRefused(save, [manchester, 45, 'own_vehicle', [], []]);
      expect(message).toMatch(/at least one place/i);
    });
  });

  it('is not something a charity or an admin can do on an auditor’s behalf', async () => {
    await withDatabase(async (db) => {
      const manchester = await placeId(db, 'Manchester');
      await db
        .as(ids.clientA)
        .expectRefused(save, [manchester, 45, 'own_vehicle', [manchester], []]);
      await db.as(ids.admin).expectRefused(save, [manchester, 45, 'own_vehicle', [manchester], []]);
    });
  });

  it('does not let an auditor approve themselves while editing coverage', async () => {
    // Coverage became editable; approval did not. That is the line.
    await withDatabase(async (db) => {
      const manchester = await placeId(db, 'Manchester');
      await db.arrange(
        "update auditor_profile set approval_status = 'pending' where user_id = $1",
        [ids.auditor],
      );
      await db.as(ids.auditor).query(save, [manchester, 45, 'own_vehicle', [manchester], []]);

      const [profile] = await db.arrange<{ approval_status: string }>(
        'select approval_status from auditor_profile where user_id = $1',
        [ids.auditor],
      );
      expect(profile?.approval_status).toBe('pending');
    });
  });
});

describe('an audit that is not in the UK', () => {
  it('can be booked, described and matched', async () => {
    // The whole point. The old schema rejected this address on insert.
    await withDatabase(async (db) => {
      const dublin = await placeId(db, 'Dublin');

      await db.arrange(
        `insert into audit (id, client_organisation_id, status, audit_type, postcode, place_id,
                            window_start_on, window_end_on)
         values ($1, $2, 'booked', 'street', 'Grafton Street, Dublin 2', $3,
                 current_date + 7, current_date + 10)`,
        ['00000000-0000-7000-8000-0000000a00d1', ids.charityA, dublin],
      );
      await db.arrange(
        "insert into auditor_coverage (auditor_id, place_id, source) values ($1, $2, 'derived')",
        [ids.auditor, dublin],
      );
      await db.arrange(
        "insert into auditor_capability (auditor_id, audit_type) values ($1, 'street') on conflict do nothing",
        [ids.auditor],
      );

      const rows = await db
        .as(ids.admin)
        .query<{ auditor_id: string; match_reason: string }>(
          'select * from eligible_auditors($1)',
          ['00000000-0000-7000-8000-0000000a00d1'],
        );

      expect(rows.map((r) => r.auditor_id)).toContain(ids.auditor);
      expect(rows[0]?.match_reason).toMatch(/covers Dublin/);
    });
  });
});
