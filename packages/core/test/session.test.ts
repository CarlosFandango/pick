import { describe, expect, it } from 'vitest';
import { AUDIT_MOMENTS } from '../src/moments';
import {
  advance,
  clockTime,
  currentMoment,
  elapsed,
  endSession,
  flag,
  isLastMoment,
  momentRows,
  startSession,
} from '../src/session';

const at = (iso: string) => new Date(iso);
const START = at('2026-03-03T11:38:00Z');

describe('startSession', () => {
  it('begins at the approach, stamped on arrival', () => {
    const session = startSession(START);
    expect(currentMoment(session)).toBe('approach');
    expect(session.marks).toHaveLength(1);
  });
});

describe('advance', () => {
  it('steps through the shift in order', () => {
    let session = startSession(START);
    for (const expected of AUDIT_MOMENTS.slice(1)) {
      session = advance(session, START);
      expect(currentMoment(session)).toBe(expected);
    }
  });

  it('stamps the time on each moment', () => {
    const session = advance(startSession(START), at('2026-03-03T11:44:00Z'));
    expect(session.marks.at(-1)).toEqual({
      moment: 'walk_up',
      occurredAt: at('2026-03-03T11:44:00Z'),
    });
  });

  it('goes no further than the last moment', () => {
    let session = startSession(START);
    for (let i = 0; i < AUDIT_MOMENTS.length + 3; i += 1) session = advance(session, START);

    expect(currentMoment(session)).toBe('close');
    expect(session.marks).toHaveLength(AUDIT_MOMENTS.length);
    expect(isLastMoment(session)).toBe(true);
  });

  it('never goes backwards', () => {
    // The interaction cannot rewind, so nor can the capture. A mis-tap is
    // corrected in write-up, not by fiddling with a phone in front of the
    // person being observed.
    const session = advance(advance(startSession(START), START), START);
    expect(session.marks.map((m) => m.moment)).toEqual(['approach', 'walk_up', 'opening']);
  });

  it('does not mutate the session it was given', () => {
    const before = startSession(START);
    advance(before, START);
    expect(before.marks).toHaveLength(1);
  });
});

describe('flags', () => {
  it('records something happened, without detail', () => {
    const session = flag(startSession(START), {
      id: 'f1',
      moment: 'pitch',
      severity: 'wrong',
      occurredAt: START,
    });

    // Detail is for write-up, when the auditor is not standing three metres
    // from the person they are observing.
    expect(session.flags).toEqual([
      { id: 'f1', moment: 'pitch', severity: 'wrong', occurredAt: START },
    ]);
  });

  it('counts flags against the moment they happened in', () => {
    let session = startSession(START);
    session = flag(session, { id: 'a', moment: 'approach', severity: 'note', occurredAt: START });
    session = flag(session, { id: 'b', moment: 'approach', severity: 'fine', occurredAt: START });
    session = flag(session, { id: 'c', moment: 'pitch', severity: 'wrong', occurredAt: START });

    const rows = momentRows(session);
    expect(rows.find((r) => r.moment === 'approach')?.flagCount).toBe(2);
    expect(rows.find((r) => r.moment === 'pitch')?.flagCount).toBe(1);
  });

  it('accepts a flag with no moment attached', () => {
    const session = flag(startSession(START), {
      id: 'f',
      moment: null,
      severity: 'note',
      occurredAt: START,
    });
    expect(session.flags).toHaveLength(1);
  });
});

describe('momentRows', () => {
  it('shows every moment, marking done, current and upcoming', () => {
    const session = advance(
      advance(startSession(START), at('2026-03-03T11:44:00Z')),
      at('2026-03-03T11:45:00Z'),
    );
    const rows = momentRows(session);

    expect(rows).toHaveLength(AUDIT_MOMENTS.length);
    expect(rows[0]).toMatchObject({ moment: 'approach', state: 'done', index: 1 });
    expect(rows[2]).toMatchObject({ moment: 'opening', state: 'current' });
    expect(rows[3]).toMatchObject({ moment: 'pitch', state: 'upcoming', occurredAt: null });
  });

  it('carries the stamped time on completed moments only', () => {
    const session = advance(startSession(START), at('2026-03-03T11:44:00Z'));
    const rows = momentRows(session);

    expect(rows[0]?.occurredAt).toEqual(START);
    // The current moment is still happening, so it has no end time to show.
    expect(rows[1]?.occurredAt).toBeNull();
  });
});

describe('elapsed', () => {
  it('reads as hours, minutes and seconds', () => {
    expect(elapsed(startSession(START), at('2026-03-03T12:20:17Z'))).toBe('00:42:17');
    expect(elapsed(startSession(START), at('2026-03-03T13:38:00Z'))).toBe('02:00:00');
    expect(elapsed(startSession(START), START)).toBe('00:00:00');
  });

  it('stops when the session ends', () => {
    const ended = endSession(startSession(START), at('2026-03-03T12:00:00Z'));
    expect(elapsed(ended, at('2026-03-03T18:00:00Z'))).toBe('00:22:00');
  });

  it('never runs backwards if the device clock jumps', () => {
    expect(elapsed(startSession(START), at('2026-03-03T10:00:00Z'))).toBe('00:00:00');
  });
});

describe('clockTime', () => {
  it('pads to two digits', () => {
    expect(clockTime(new Date(2026, 2, 3, 9, 5))).toBe('09:05');
    expect(clockTime(new Date(2026, 2, 3, 11, 41))).toBe('11:41');
  });
});
