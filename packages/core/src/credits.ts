import { type CurrencyCode, DEFAULT_CURRENCY, formatMoney } from './money';

/**
 * What one credit costs — one credit books one audit.
 *
 * Amount and currency travel together, because an amount on its own is not a
 * price. This is the list price, for screens that quote it; what was actually
 * charged on a given purchase is on the ledger row, because a price that
 * changes must not rewrite history.
 */
export const CREDIT_PRICE: { minorUnits: number; currency: CurrencyCode } = {
  minorUnits: 17_500,
  currency: DEFAULT_CURRENCY,
};

/** "£175" — the list price, formatted. */
export function creditPriceLabel(): string {
  return formatMoney(CREDIT_PRICE.minorUnits, CREDIT_PRICE.currency);
}

export type CreditReason = 'purchase' | 'booking' | 'refund' | 'adjustment' | 'expiry';

export interface CreditEntry {
  id: string;
  delta: number;
  reason: CreditReason;
  occurredAt: Date;
  auditReference?: string | null;
  unitPriceMinorUnits?: number | null;
  note?: string | null;
}

export const CREDIT_REASON_LABELS: Record<CreditReason, string> = {
  purchase: 'Credits purchased',
  booking: 'Audit booked',
  refund: 'Credit returned',
  adjustment: 'Adjustment',
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
  return delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`;
}

/** "£700" for a purchase of 4 at £175. Nothing for a movement with no money. */
export function valueLabel(entry: CreditEntry): string {
  if (!entry.unitPriceMinorUnits || entry.reason !== 'purchase') return '';
  return formatMoney(entry.unitPriceMinorUnits * entry.delta);
}
