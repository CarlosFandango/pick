import { describe, expect, it } from 'vitest';
import { payBreakdown, poundsFromPence, totalPence } from '../src/format/money';
import { expiresIn, offerArea, windowLabel } from '../src/format/offer';

describe('money', () => {
  it.each([
    [10000, '£100'],
    [11500, '£115'],
    [1500, '£15'],
    [12550, '£125.50'],
    [0, '£0'],
  ])('renders %i pence as %s', (pence, expected) => {
    expect(poundsFromPence(pence)).toBe(expected);
  });

  it('itemises pay the way the offer screen must show it', () => {
    const lines = [
      { label: 'audit', pence: 10000 },
      { label: 'travel uplift', pence: 1500 },
    ];
    expect(payBreakdown(lines)).toBe('£100 audit + £15 travel uplift');
    expect(totalPence(lines)).toBe(11500);
  });

  it('never loses pence to floating point', () => {
    expect(
      totalPence([
        { label: 'a', pence: 1 },
        { label: 'b', pence: 2 },
      ]),
    ).toBe(3);
  });
});

describe('expiresIn', () => {
  const now = new Date('2026-03-01T10:00:00Z');

  it.each([
    ['2026-03-03T08:00:00Z', 'EXPIRES IN 46H'],
    ['2026-03-01T11:30:00Z', 'EXPIRES IN 1H'],
    ['2026-03-01T10:20:00Z', 'EXPIRES IN 20M'],
    ['2026-03-01T09:00:00Z', 'EXPIRED'],
  ])('renders %s as %s', (at, expected) => {
    expect(expiresIn(new Date(at), now)).toBe(expected);
  });

  it('never reports zero minutes while the offer is still open', () => {
    expect(expiresIn(new Date('2026-03-01T10:00:30Z'), now)).toBe('EXPIRES IN 1M');
  });
});

describe('offerArea', () => {
  it('shows the area, with a locality when there is one', () => {
    expect(offerArea('SE15', 'Peckham')).toBe('SE15 — Peckham');
    expect(offerArea('SE15')).toBe('SE15');
    expect(offerArea('SE15', null)).toBe('SE15');
  });
});

describe('windowLabel', () => {
  it('reads as a range a person would say out loud', () => {
    expect(windowLabel(new Date('2026-03-03T00:00:00Z'), new Date('2026-03-05T00:00:00Z'))).toBe(
      'Tue 3 – Thu 5 March',
    );
  });
});
