import { type CurrencyCode, DEFAULT_CURRENCY, formatMoney } from './money';

/**
 * A quantity of credits at a price. One credit books one audit.
 *
 * Amount and currency travel together, because an amount on its own is not a
 * price. The list lives in `credit_bundle` and is read, not hardcoded — a
 * price that changed in code would rewrite the history of every past purchase.
 * What was actually charged is on the ledger row.
 */
export interface CreditBundle {
  quantity: number;
  priceMinorUnits: number;
  currency: CurrencyCode;
}

/**
 * What each credit in a bundle works out at.
 *
 * The reason credits are not fungible: a charity holding one single credit and
 * a bundle of four is holding credits worth different amounts, and revenue per
 * audit is unknowable unless each one remembers what it cost.
 */
export function effectiveUnitPrice(bundle: CreditBundle): number {
  return Math.round(bundle.priceMinorUnits / bundle.quantity);
}

/** "£250 · £250.00 each" — a bundle as a charity reads it. */
export function bundleLabel(bundle: CreditBundle): string {
  const total = formatMoney(bundle.priceMinorUnits, bundle.currency);
  const each = formatMoney(effectiveUnitPrice(bundle), bundle.currency);
  return bundle.quantity === 1 ? total : `${total} · ${each} each`;
}

/** Cheapest first by unit price, which is the order a buyer compares them in. */
export function sortBundles(bundles: readonly CreditBundle[]): CreditBundle[] {
  return [...bundles].sort((a, b) => a.quantity - b.quantity);
}

export const DEFAULT_BUNDLE_CURRENCY: CurrencyCode = DEFAULT_CURRENCY;

export type CreditReason =
  | 'purchase'
  | 'reservation'
  | 'consumption'
  | 'release'
  | 'refund'
  | 'adjustment'
  | 'expiry';

export interface CreditEntry {
  id: string;
  delta: number;
  reason: CreditReason;
  occurredAt: Date;
  auditReference?: string | null;
  unitPriceMinorUnits?: number | null;
  note?: string | null;
}

/**
 * In the charity's language, not the ledger's.
 *
 * A reservation and a consumption are two different facts about the same
 * credit: it is set aside when the audit is booked and actually spent when the
 * audit reaches them. A charity reading this should be able to see which of
 * their credits are committed and which have been used.
 */
export const CREDIT_REASON_LABELS: Record<CreditReason, string> = {
  purchase: 'Credits purchased',
  reservation: 'Set aside for an audit',
  consumption: 'Used — audit delivered',
  release: 'Returned — audit not delivered',
  refund: 'Refunded',
  adjustment: 'Adjustment by PICK',
  expiry: 'Credits expired',
};

/**
 * A running balance beside every line.
 *
 * The ledger is append-only, so the balance is never stored — it is the sum of
 * everything above. Showing it per line is what makes the list auditable by
 * the person reading it rather than something they have to trust.
 */
export interface LedgerLine extends CreditEntry {
  balanceAfter: number;
}

export function runningBalance(entries: readonly CreditEntry[]): LedgerLine[] {
  const oldestFirst = [...entries].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime() || a.id.localeCompare(b.id),
  );

  let balance = 0;
  const lines = oldestFirst.map((entry) => {
    balance += entry.delta;
    return { ...entry, balanceAfter: balance };
  });

  // Newest first for reading; the balance still reads down from the top.
  return lines.reverse();
}

export function currentBalance(entries: readonly CreditEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.delta, 0);
}

/** "+4" or "−1". A minus sign, not a hyphen. */
export function deltaLabel(delta: number): string {
  // A consumption moves nothing — the credit left at reservation — so its
  // delta is zero, and "−0" is correct arithmetic and nonsense as English on
  // the ledger's most important row: the one saying the charity received what
  // it paid for. An em dash says "no change" without looking like a fault.
  if (delta === 0) return '—';
  return delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`;
}

/**
 * "£700" for a purchase of 4 at £175. Nothing for a movement with no money.
 *
 * The blank on every other row is deliberate and was nearly undone by TND-99:
 * a reservation carries a unit price, so it looks like a value waiting to be
 * shown. It is not. The purchase row already states what the charity paid, and
 * pricing each reservation as well would make the column sum to twice the
 * money that ever moved.
 *
 * What a specific audit cost is a real question, and FIFO-at-reservation
 * exists to answer it — but it belongs on the audit, not in a column of money.
 */
export function valueLabel(entry: CreditEntry): string {
  if (!entry.unitPriceMinorUnits || entry.reason !== 'purchase') return '';
  return formatMoney(entry.unitPriceMinorUnits * entry.delta);
}
