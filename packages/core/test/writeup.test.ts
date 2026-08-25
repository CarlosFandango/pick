import { describe, expect, it } from 'vitest';
import type { AuditMoment } from '../src/moments';
import {
  type Answer,
  buildWriteUp,
  momentSummary,
  submitLabel,
  type WriteUpCheck,
} from '../src/writeup';

let seq = 0;
const check = (moment: AuditMoment, over: Partial<WriteUpCheck> = {}): WriteUpCheck => {
  seq += 1;
  return { id: `k${seq}`, moment, prompt: `prompt ${seq}`, sortOrder: seq, ...over };
};

const answers = (entries: [string, Answer][]) => new Map(entries);

describe('buildWriteUp', () => {
  it('replays the shift in the same order as prep and the field session', () => {
    const writeUp = buildWriteUp({
      checks: [check('close'), check('approach'), check('pitch')],
      answers: answers([]),
    });

    // An auditor should never translate between three orderings of one shift.
    expect(writeUp.moments.map((m) => m.moment)).toEqual(['approach', 'pitch', 'close']);
  });

  it('numbers moments by their place in the whole sequence', () => {
    const writeUp = buildWriteUp({ checks: [check('pitch')], answers: answers([]) });
    // Pitch is the fourth moment even when it is the only one with checks.
    expect(writeUp.moments[0]?.index).toBe(4);
  });

  it('counts verdicts per moment', () => {
    const a = check('approach');
    const b = check('approach');
    const c = check('approach');

    const writeUp = buildWriteUp({
      checks: [a, b, c],
      answers: answers([
        [a.id, { verdict: 'pass' }],
        [b.id, { verdict: 'fail' }],
        [c.id, { verdict: 'note' }],
      ]),
    });

    expect(writeUp.moments[0]?.counts).toEqual({ pass: 1, fail: 1, note: 1 });
  });

  it('is complete only when every check in the moment is answered', () => {
    const a = check('ask');
    const b = check('ask');

    const partly = buildWriteUp({
      checks: [a, b],
      answers: answers([[a.id, { verdict: 'pass' }]]),
    });
    expect(partly.moments[0]?.complete).toBe(false);

    const fully = buildWriteUp({
      checks: [a, b],
      answers: answers([
        [a.id, { verdict: 'pass' }],
        [b.id, { verdict: 'pass' }],
      ]),
    });
    expect(fully.moments[0]?.complete).toBe(true);
  });

  it('will not submit a partial write-up', () => {
    const a = check('ask');
    const b = check('close');

    const writeUp = buildWriteUp({
      checks: [a, b],
      answers: answers([[a.id, { verdict: 'pass' }]]),
    });

    // PICK cannot review what is not there.
    expect(writeUp.canSubmit).toBe(false);
    expect(writeUp.momentsRemaining).toBe(1);
  });

  it('submits when every moment is done', () => {
    const a = check('ask');
    const writeUp = buildWriteUp({ checks: [a], answers: answers([[a.id, { verdict: 'fail' }]]) });

    expect(writeUp.canSubmit).toBe(true);
    expect(writeUp.momentsRemaining).toBe(0);
  });

  it('will not submit an empty catalogue', () => {
    expect(buildWriteUp({ checks: [], answers: answers([]) }).canSubmit).toBe(false);
  });

  it('will not submit twice', () => {
    const a = check('ask');
    const writeUp = buildWriteUp({
      checks: [a],
      answers: answers([[a.id, { verdict: 'pass' }]]),
      state: 'submitted',
    });
    expect(writeUp.canSubmit).toBe(false);
  });

  it('keeps every moment editable while the draft is local', () => {
    const writeUp = buildWriteUp({
      checks: [check('approach'), check('pitch')],
      answers: answers([]),
    });
    expect(writeUp.moments.every((m) => m.editable)).toBe(true);
  });

  it('unlocks only the flagged moments when PICK returns it', () => {
    const writeUp = buildWriteUp({
      checks: [check('approach'), check('pitch')],
      answers: answers([]),
      state: 'returned',
      unlockedMoments: new Set<AuditMoment>(['pitch']),
    });

    // The auditor fixes what was wrong rather than re-litigating the shift.
    expect(writeUp.moments.find((m) => m.moment === 'approach')?.editable).toBe(false);
    expect(writeUp.moments.find((m) => m.moment === 'pitch')?.editable).toBe(true);
  });

  it('locks everything once submitted', () => {
    const writeUp = buildWriteUp({
      checks: [check('approach')],
      answers: answers([]),
      state: 'submitted',
    });
    expect(writeUp.moments[0]?.editable).toBe(false);
  });

  it('carries the markers from the field session onto the moment', () => {
    const at = new Date('2026-03-03T11:52:00Z');
    const writeUp = buildWriteUp({
      checks: [check('pitch')],
      answers: answers([]),
      markers: new Map([['pitch', [at]]]),
    });

    // What the auditor flagged at the time, shown while they judge it.
    expect(writeUp.moments[0]?.markers).toEqual([at]);
  });

  it('ignores an answer for a check outside the catalogue', () => {
    const a = check('ask');
    const writeUp = buildWriteUp({
      checks: [a],
      answers: answers([
        [a.id, { verdict: 'pass' }],
        ['retired', { verdict: 'fail' }],
      ]),
    });
    expect(writeUp.moments[0]?.counts).toEqual({ pass: 1, fail: 0, note: 0 });
  });
});

describe('momentSummary', () => {
  it('reads "6 PASS" when unanimous', () => {
    const checks = Array.from({ length: 6 }, () => check('approach'));
    const writeUp = buildWriteUp({
      checks,
      answers: answers(checks.map((c) => [c.id, { verdict: 'pass' as const }])),
    });
    expect(momentSummary(writeUp.moments[0] as never)).toBe('6 PASS');
  });

  it('leads with failures when the moment is mixed', () => {
    const a = check('pitch');
    const b = check('pitch');
    const writeUp = buildWriteUp({
      checks: [a, b],
      answers: answers([
        [a.id, { verdict: 'pass' }],
        [b.id, { verdict: 'fail' }],
      ]),
    });
    // A charity reads the failure first; so does the auditor checking their work.
    expect(momentSummary(writeUp.moments[0] as never)).toBe('1 FAIL · 1 PASS');
  });

  it('says TO DO when the moment is unfinished', () => {
    const writeUp = buildWriteUp({ checks: [check('close')], answers: answers([]) });
    expect(momentSummary(writeUp.moments[0] as never)).toBe('TO DO');
  });
});

describe('submitLabel', () => {
  it('counts down the moments left, in plain English', () => {
    const three = buildWriteUp({
      checks: [check('ask'), check('tablet'), check('close')],
      answers: answers([]),
    });
    expect(submitLabel(three)).toBe('Submit — 3 moments left');

    const one = buildWriteUp({ checks: [check('close')], answers: answers([]) });
    expect(submitLabel(one)).toBe('Submit — 1 moment left');
  });

  it('is just "Submit" when it is ready', () => {
    const a = check('close');
    const ready = buildWriteUp({ checks: [a], answers: answers([[a.id, { verdict: 'pass' }]]) });
    expect(submitLabel(ready)).toBe('Submit');
  });
});
