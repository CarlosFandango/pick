import { describe, expect, it } from 'vitest';
import { formatDateRange, formatDay, formatDayLong, formatMoment } from '../src/dates';

/**
 * TND-98 — one register for dates.
 *
 * These pin the shape rather than the wording of any one screen: the point of
 * the module is that every screen agrees, so the test that matters is that
 * there is one answer.
 */

describe('how a date is written', () => {
  it('leads with the weekday, because that is what is actually being asked', () => {
    // "Is that a Saturday?" is the question an auditor has about a shift, and
    // a bare date makes them count.
    expect(formatDay(new Date('2026-03-03T09:00:00Z'))).toBe('Tue 3 Mar');
  });

  it('states the month once across a window', () => {
    expect(formatDateRange(new Date('2026-03-03'), new Date('2026-03-05'))).toBe(
      'Tue 3 – Thu 5 March',
    );
  });

  it('takes the month from the end of a window that crosses a boundary', () => {
    // "Sat 31 – Tue 3 September" is one fact. Naming both months makes the
    // reader reconcile two.
    expect(formatDateRange(new Date('2026-08-31'), new Date('2026-09-03'))).toBe(
      'Mon 31 – Thu 3 September',
    );
  });

  it('gives the year only where the year is the point', () => {
    expect(formatDay(new Date('2026-03-03'))).not.toMatch(/2026/);
    expect(formatDayLong(new Date('2026-03-03'))).toMatch(/2026/);
  });

  it('carries a time only for a moment, never for a day', () => {
    expect(formatMoment(new Date('2026-03-03T14:05:00'))).toBe('Tue 3 Mar, 14:05');
    expect(formatDay(new Date('2026-03-03T14:05:00'))).not.toMatch(/14/);
  });

  it('never produces the two registers it replaced', () => {
    // The regression this module exists to prevent: an ISO date or a
    // dd/mm/yyyy reaching a screen.
    for (const written of [
      formatDay(new Date('2026-08-22')),
      formatDayLong(new Date('2026-08-22')),
      formatDateRange(new Date('2026-08-22'), new Date('2026-08-24')),
      formatMoment(new Date('2026-08-22T09:00:00')),
    ]) {
      expect(written).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(written).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    }
  });
});
