import { poundsFromPence } from './money';

export interface EarningLine {
  auditId: string;
  title: string;
  dateLabel: string;
  basePence: number;
  travelPence: number;
  state: 'pending' | 'paid';
  payoutReference?: string | null;
}

export interface EarningsSummary {
  pendingPence: number;
  pendingCount: number;
  pendingTravelPence: number;
  paidPence: number;
}

export function summariseEarnings(lines: readonly EarningLine[]): EarningsSummary {
  const pending = lines.filter((l) => l.state === 'pending');
  const paid = lines.filter((l) => l.state === 'paid');

  const total = (rows: readonly EarningLine[]) =>
    rows.reduce((sum, row) => sum + row.basePence + row.travelPence, 0);

  return {
    pendingPence: total(pending),
    pendingCount: pending.length,
    pendingTravelPence: pending.reduce((sum, row) => sum + row.travelPence, 0),
    paidPence: total(paid),
  };
}

/**
 * "3 audits · incl. £37 travel uplift"
 *
 * The uplift is always named. An auditor who cannot see what they were paid
 * for travel cannot tell whether a long job was worth taking.
 */
export function pendingLine(summary: EarningsSummary): string {
  const audits = summary.pendingCount === 1 ? 'audit' : 'audits';
  const parts = [`${summary.pendingCount} ${audits}`];
  if (summary.pendingTravelPence > 0) {
    parts.push(`incl. ${poundsFromPence(summary.pendingTravelPence)} travel uplift`);
  }
  return parts.join(' · ');
}

/** "PENDING — NEXT RUN FRI 6 MAR" */
export function nextRunLabel(nextRun: Date | null): string {
  if (!nextRun) return 'PENDING';
  const when = nextRun
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .toUpperCase()
    .replace(',', '');
  return `PENDING — NEXT RUN ${when}`;
}
