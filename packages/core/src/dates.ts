/**
 * How a date is written, everywhere (TND-98).
 *
 * There were three registers before this: `2026-08-22 → 2026-08-24` on the
 * admin audits table, `20/08/2026` in the credit ledger, and
 * `Tue 3 – Thu 5 March` in the field app and the client report. The third is
 * the one the design chose, and it is the right one — a weekday tells an
 * auditor whether a shift is a Saturday without them counting, and that is
 * the question they are actually asking.
 *
 * Same argument as `formatMoney`: a date formatted inside a component is a
 * date that will be formatted differently in the next component. One module,
 * so the product can only have one voice.
 *
 * `en-GB` is hardcoded, deliberately. Every audit is in the UK, every reader
 * is in the UK, and a locale parameter nothing passes is a configuration point
 * with one value — the thing the over-engineering list exists to refuse. It
 * becomes an argument on the day there is a second country, and that is a
 * one-line change because it is one module.
 */

/** "Tue 3 Mar" — a day, at a glance. */
export function formatDay(date: Date): string {
  return date
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(',', '');
}

/** "Tue 3 March 2026" — a day, in full, where the year matters. */
export function formatDayLong(date: Date): string {
  return date
    .toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    .replace(',', '');
}

/**
 * "Tue 3 – Thu 5 March" — a booking window.
 *
 * The month is stated once, from the end of the window, because a window
 * spanning a month boundary reads better as "Sat 31 – Tue 3 September" than as
 * two months an auditor has to reconcile. A window spanning a year is not a
 * thing this product has.
 */
export function formatDateRange(start: Date, end: Date): string {
  const day = (d: Date) =>
    d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }).replace(',', '');
  const month = end.toLocaleDateString('en-GB', { month: 'long' });
  return `${day(start)} – ${day(end)} ${month}`;
}

/**
 * "Tue 3 Mar, 14:05" — a moment, where the time is part of the fact.
 *
 * Used for evidence: when an audit was submitted, when a risk was advised.
 * Everywhere else the day is enough, and a time is noise.
 */
export function formatMoment(date: Date): string {
  return `${formatDay(date)}, ${date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}
