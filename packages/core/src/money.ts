/**
 * Money is an integer number of a currency's smallest unit, everywhere. This
 * is the only place it becomes a string, so a rounding or formatting decision
 * cannot be made twice differently.
 *
 * Nothing here assumes sterling. The market is UK today and `residency_zone`
 * already models `eea` and `other`, so a currency baked into a helper name, a
 * symbol or a hardcoded `/100` is a rewrite waiting to happen — and the kind
 * that surfaces as wrong numbers on an invoice rather than a failing build.
 *
 * The divisor comes from the currency, not from 100: not every currency has
 * two decimal places.
 */

/** ISO 4217, e.g. GBP, EUR, USD. */
export type CurrencyCode = string;

export const DEFAULT_CURRENCY: CurrencyCode = 'GBP';

/** Formatted for a British reader. Locale is presentation; currency is data. */
const LOCALE = 'en-GB';

/** How many minor units make one major unit — 100 for GBP, 1 for JPY. */
function minorUnitsPerMajor(currency: CurrencyCode): number {
  const { maximumFractionDigits } = new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
  }).resolvedOptions();
  // Typed optional because it is optional as an *input*; as a resolved option
  // for a currency format it is always present.
  return 10 ** (maximumFractionDigits ?? 2);
}

/** "£175", "£1.50", "¥500". Whole amounts lose the empty decimals. */
export function formatMoney(minorUnits: number, currency: CurrencyCode = DEFAULT_CURRENCY): string {
  const major = minorUnits / minorUnitsPerMajor(currency);
  const digits = Number.isInteger(major) ? 0 : undefined;

  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(major);
}

export interface PayLine {
  label: string;
  minorUnits: number;
}

/** "£100 audit + £15 travel uplift" — the itemisation the design requires. */
export function payBreakdown(
  lines: readonly PayLine[],
  currency: CurrencyCode = DEFAULT_CURRENCY,
): string {
  return lines.map((line) => `${formatMoney(line.minorUnits, currency)} ${line.label}`).join(' + ');
}

export function totalMinorUnits(lines: readonly PayLine[]): number {
  return lines.reduce((sum, line) => sum + line.minorUnits, 0);
}
