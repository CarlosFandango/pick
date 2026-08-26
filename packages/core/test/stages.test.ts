import { describe, expect, it } from 'vitest';
import {
  type AuditStage,
  addMarker,
  addTally,
  advanceStage,
  currentStage,
  elapsedSince,
  endStagedSession,
  isLastStage,
  permissions,
  stageForMoment,
  stageRows,
  startStagedSession,
  tallyCount,
} from '../src/stages';

/** The seeded default, trimmed to what a test needs to say something. */
const STAGES: AuditStage[] = [
  {
    key: 'arrival',
    label: 'Arrival and setup',
    sequence: 1,
    captureMode: 'observation',
    moment: null,
    durationHintMinutes: null,
  },
  {
    key: 'team_observation',
    label: 'Team observation',
    sequence: 2,
    captureMode: 'observation',
    moment: 'approach',
    durationHintMinutes: 45,
  },
  {
    key: 'pitch',
    label: 'Pitch',
    sequence: 3,
    captureMode: 'interaction',
    moment: 'pitch',
    durationHintMinutes: null,
  },
  {
    key: 'close',
    label: 'Close and exit',
    sequence: 4,
    captureMode: 'interaction',
    moment: 'close',
    durationHintMinutes: null,
  },
];

const START = new Date(2026, 2, 3, 11, 0, 0);
const at = (minutes: number) => new Date(START.getTime() + minutes * 60_000);

describe('what an auditor may do during a stage', () => {
  it('lets an observer hold a phone', () => {
    // A bystander at a distance. Tallies over 45 minutes are the whole point
    // of this half — nobody recalls a stop rate afterwards.
    const observing = permissions(STAGES[1] as AuditStage);
    expect(observing.tallies).toBe(true);
    expect(observing.notes).toBe(true);
  });

  it('gives someone being pitched to nothing to fill in', () => {
    // The discretion constraint is severe here and mild in the other phase.
    // An auditor tapping counters while a fundraiser talks to them is not a
    // mystery shopper any more.
    const interacting = permissions(STAGES[2] as AuditStage);
    expect(interacting.tallies).toBe(false);
    expect(interacting.notes).toBe(false);
  });

  it('keeps a single marker available throughout', () => {
    // One tap, no reading. The spec allows "a single discreet marker at most"
    // during an interaction, and something going wrong mid-pitch is exactly
    // when an auditor needs to record that it did.
    for (const stage of STAGES) {
      expect(permissions(stage).markers, stage.key).toBe(true);
    }
  });
});

describe('moving through the stages', () => {
  it('starts on the first stage, whatever it is called', () => {
    const session = startStagedSession(STAGES, START);
    expect(currentStage(STAGES, session)?.key).toBe('arrival');
  });

  it('takes its order from the data, not from the array it was handed', () => {
    // The sequence is Jaz's to set and the query may return any order.
    const shuffled = [STAGES[2], STAGES[0], STAGES[3], STAGES[1]] as AuditStage[];
    expect(currentStage(shuffled, startStagedSession(shuffled, START))?.key).toBe('arrival');
  });

  it('goes forward only', () => {
    // A mis-tap is corrected in write-up, where there is time to think, not by
    // fiddling with a phone in front of the person being observed.
    let session = startStagedSession(STAGES, START);
    session = advanceStage(STAGES, session, at(45));
    session = advanceStage(STAGES, session, at(50));

    expect(currentStage(STAGES, session)?.key).toBe('pitch');
    expect(session.entries.map((e) => e.stageKey)).toEqual([
      'arrival',
      'team_observation',
      'pitch',
    ]);
  });

  it('stops at the last stage rather than running off the end', () => {
    let session = startStagedSession(STAGES, START);
    for (let i = 0; i < 10; i++) session = advanceStage(STAGES, session, at(i));

    expect(isLastStage(STAGES, session)).toBe(true);
    expect(currentStage(STAGES, session)?.key).toBe('close');
  });

  it('timestamps every stage it enters', () => {
    // The acceptance criterion, and the thing an observation phase is scored
    // on: a 45-minute stage that lasted four minutes did not happen.
    let session = startStagedSession(STAGES, START);
    session = advanceStage(STAGES, session, at(45));

    expect(session.entries.map((e) => e.enteredAt)).toEqual([START, at(45)]);
  });
});

describe('tallies', () => {
  it('counts what happened during an observation stage', () => {
    let session = startStagedSession(STAGES, START);
    session = advanceStage(STAGES, session, at(2));

    for (const minute of [5, 9, 14]) {
      session = addTally(STAGES, session, {
        stageKey: 'team_observation',
        counterKey: 'stops',
        occurredAt: at(minute),
      });
    }

    expect(tallyCount(session, 'team_observation', 'stops')).toBe(3);
    expect(tallyCount(session, 'team_observation', 'asks')).toBe(0);
  });

  it('refuses a tally on an interaction stage', () => {
    // Enforced in the domain, not only by hiding the control: a screen is one
    // way in, and the rule is about what the audit means, not about layout.
    const session = startStagedSession(STAGES, START);
    const after = addTally(STAGES, session, {
      stageKey: 'pitch',
      counterKey: 'stops',
      occurredAt: at(50),
    });

    expect(after.tallies).toHaveLength(0);
  });

  it('refuses a tally for a stage that does not exist', () => {
    const session = startStagedSession(STAGES, START);
    const after = addTally(STAGES, session, {
      stageKey: 'nonsense',
      counterKey: 'stops',
      occurredAt: at(1),
    });

    expect(after.tallies).toHaveLength(0);
  });
});

describe('markers', () => {
  it('records one against the stage it happened in', () => {
    let session = startStagedSession(STAGES, START);
    session = addMarker(session, {
      id: 'm1',
      stageKey: 'pitch',
      severity: 'wrong',
      occurredAt: at(52),
    });

    const rows = stageRows(STAGES, session);
    expect(rows.find((r) => r.stage.key === 'pitch')?.markerCount).toBe(1);
  });
});

describe('a check finding its stage', () => {
  it('resolves through the moment the check already carries', () => {
    // No stage column on the catalogue: a check has a moment, a stage covers a
    // moment, so rearranging stages never touches a check.
    expect(stageForMoment(STAGES, 'pitch')?.key).toBe('pitch');
    expect(stageForMoment(STAGES, 'approach')?.key).toBe('team_observation');
  });

  it('returns nothing for a moment no stage covers', () => {
    expect(stageForMoment(STAGES, 'sign_up')).toBeNull();
  });
});

describe('the running clock', () => {
  it('reads at arm’s length', () => {
    expect(elapsedSince(START, at(42))).toBe('00:42:00');
  });

  it('stops when the session ends', () => {
    const session = endStagedSession(startStagedSession(STAGES, START), at(60));
    expect(elapsedSince(session.startedAt, session.endedAt as Date)).toBe('01:00:00');
  });
});
