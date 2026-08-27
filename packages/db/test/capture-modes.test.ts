import { describe, expect, it } from 'vitest';
import { ids, withDatabase } from './rls';

/**
 * TND-83 — the stage list is configuration, so this is where its rules live.
 *
 * `permissions()` in core used to decide what an auditor could do by switching
 * on the stage name. It now reads three flags off the row, which means the
 * behaviour these tests describe is no longer assertable in a unit test: a
 * fixture that states the values would only prove it agrees with itself.
 *
 * So the seed is the subject. If someone changes what an interaction stage
 * permits, this is what stops it going out unnoticed.
 */

interface CaptureMode {
  key: string;
  allows_tallies: boolean;
  allows_notes: boolean;
  allows_markers: boolean;
  caution: string | null;
}

const modes = (db: Awaited<Parameters<Parameters<typeof withDatabase>[0]>[0]>) =>
  db
    .as(ids.auditor)
    .query<CaptureMode>(
      'select key, allows_tallies, allows_notes, allows_markers, caution from audit_capture_mode order by sort_order',
    );

describe('what the seeded stages permit', () => {
  it('lets an auditor watching from a distance hold a phone', async () => {
    // Tallies across the observation half are the whole point of it — nobody
    // recalls a stop rate accurately afterwards.
    await withDatabase(async (db) => {
      const observation = (await modes(db)).find((m) => m.key === 'observation');
      expect(observation?.allows_tallies).toBe(true);
      expect(observation?.allows_notes).toBe(true);
    });
  });

  it('gives an auditor being pitched to nothing to fill in', async () => {
    // A fundraiser who watches their prospect tallying has stopped behaving
    // normally, and the audit has stopped measuring what it claims to.
    await withDatabase(async (db) => {
      const interaction = (await modes(db)).find((m) => m.key === 'interaction');
      expect(interaction?.allows_tallies).toBe(false);
      expect(interaction?.allows_notes).toBe(false);
    });
  });

  it('explains on the row itself why the interaction stage is restricted', async () => {
    // The reason has to travel with the setting. Someone flipping this in the
    // admin screen a year from now will not have read the spec, and a bare
    // toggle gives them nothing to weigh.
    await withDatabase(async (db) => {
      const interaction = (await modes(db)).find((m) => m.key === 'interaction');
      expect(interaction?.caution).toBeTruthy();
    });
  });

  it('keeps a single marker available in every stage', async () => {
    // One tap, no reading. Something going wrong mid-pitch is exactly when an
    // auditor needs to be able to record that it did.
    await withDatabase(async (db) => {
      for (const mode of await modes(db)) {
        expect(mode.allows_markers, mode.key).toBe(true);
      }
    });
  });
});

describe('the stage list as configuration', () => {
  it('accepts a new stage without a migration', async () => {
    // The point of the ticket. A third way of capturing an audit should cost a
    // row, not an enum value, a switch arm and a release.
    await withDatabase(async (db) => {
      await db.arrange(
        `insert into audit_capture_mode (key, label, sort_order, allows_tallies, allows_notes)
         values ('debrief', 'Debrief', 3, false, true)`,
      );

      const added = (await modes(db)).find((m) => m.key === 'debrief');
      expect(added?.allows_notes).toBe(true);
      expect(added?.allows_tallies).toBe(false);
    });
  });

  it('will not let a stage template point at a stage that does not exist', async () => {
    // The foreign key is what makes the list authoritative. Without it a typo
    // in a template row would produce a stage with no permissions at all,
    // which the device reads as "capture nothing" — a silently useless shift.
    await withDatabase(async (db) => {
      await expect(
        db.arrange(
          `insert into audit_stage_template (audit_type, sequence, key, label, capture_mode)
           values ('street', 99, 'nonsense', 'Nonsense', 'not_a_stage')`,
        ),
      ).rejects.toThrow();
    });
  });

  it('lets an auditor read the stage list, because they cannot run a shift without it', async () => {
    await withDatabase(async (db) => {
      expect((await modes(db)).length).toBeGreaterThan(0);
    });
  });

  it('does not let an auditor edit what a stage permits', async () => {
    // An auditor who could turn tallies on during the mystery shop could
    // quietly change what their own audit measures.
    await withDatabase(async (db) => {
      await db
        .as(ids.auditor)
        .query("update audit_capture_mode set allows_tallies = true where key = 'interaction'");

      const interaction = (await modes(db)).find((m) => m.key === 'interaction');
      expect(interaction?.allows_tallies).toBe(false);
    });
  });
});
