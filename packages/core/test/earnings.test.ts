import { describe, expect, it } from 'vitest';
import { type EarningLine, nextRunLabel, pendingLine, summariseEarnings } from '../src/earnings';

let seq = 0;
const line = (over: Partial<EarningLine> = {}): EarningLine => {
  seq += 1;
  return {
    auditId: `a${seq}`,
    title: 'Street · SE15',
    dateLabel: 'Tue 3 Mar',
    basePence: 10000,
    travelPence: 1500,
    state: 'pending',
    ...over,
  };
};

describe('summariseEarnings', () => {
  it('totals what is owed and what has been paid, separately', () => {
    const summary = summariseEarnings([
      line(),
      line({ travelPence: 2200 }),
      line({ state: 'paid', travelPence: 0 }),
    ]);

    expect(summary.pendingPence).toBe(23700);
    expect(summary.pendingCount).toBe(2);
    expect(summary.paidPence).toBe(10000);
  });

  it('keeps the travel uplift visible in its own right', () => {
    // An auditor who cannot see what they were paid for travel cannot tell
    // whether a long job was worth taking.
    const summary = summariseEarnings([line({ travelPence: 1500 }), line({ travelPence: 2200 })]);
    expect(summary.pendingTravelPence).toBe(3700);
  });

  it('is zero, not undefined, with nothing to show', () => {
    expect(summariseEarnings([])).toEqual({
      pendingPence: 0,
      pendingCount: 0,
      pendingTravelPence: 0,
      paidPence: 0,
    });
  });
});

describe('pendingLine', () => {
  it('names the uplift', () => {
    const summary = summariseEarnings([
      line({ travelPence: 1500 }),
      line({ travelPence: 2200 }),
      line({ travelPence: 0 }),
    ]);
    expect(pendingLine(summary)).toBe('3 audits · incl. £37 travel uplift');
  });

  it('says nothing about uplift when there was none', () => {
    expect(pendingLine(summariseEarnings([line({ travelPence: 0 })]))).toBe('1 audit');
  });
});

describe('nextRunLabel', () => {
  it('says when the money actually arrives', () => {
    expect(nextRunLabel(new Date('2026-03-06T00:00:00Z'))).toBe('PENDING — NEXT RUN FRI 6 MAR');
  });

  it('does not invent a date it does not have', () => {
    expect(nextRunLabel(null)).toBe('PENDING');
  });
});
