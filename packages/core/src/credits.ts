import { poundsFromPence } from './money';

export type CreditReason = 'purchase' | 'booking' | 'refund' | 'adjustment' | 'expiry';

export interface CreditEntry {
  id: string;
  delta: number;
  reason: CreditReason;
  occurredAt: Date;
  auditReference?: string | null;
  unitPricePence?: number | null;
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

/**
 * @param closingBalance the organisation's balance after the newest entry in
 * `entries`.
 *
 * Required, and deliberately so. A screen showing the most recent hundred
 * movements of a longer ledger cannot know what the balance was before them,
 * and accumulating from zero puts every figure on the page out by the same
 * amount — plausibly, silently, and disagreeing with the balance every other
 * screen reads from `organisation_credit_balance`. Making the caller name the
 * closing balance is the compiler asking a question that is easy to forget and
 * expensive to get wrong. A caller that genuinely holds the whole ledger passes
 * `currentBalance(entries)`.
 */
export function runningBalance(
  entries: readonly CreditEntry[],
  closingBalance: number,
): LedgerLine[] {
  const oldestFirst = [...entries].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime() || a.id.localeCompare(b.id),
  );

  let balance = closingBalance - currentBalance(oldestFirst);

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
  if (!entry.unitPricePence || entry.reason !== 'purchase') return '';
  return poundsFromPence(entry.unitPricePence * entry.delta);
}
