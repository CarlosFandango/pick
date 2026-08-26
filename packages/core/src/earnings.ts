import { formatMoney } from './money';

export interface EarningLine {
  auditId: string;
  title: string;
  dateLabel: string;
  baseMinorUnits: number;
  travelMinorUnits: number;
  state: 'pending' | 'paid';
  payoutReference?: string | null;
}

export interface EarningsSummary {
  pendingMinorUnits: number;
  pendingCount: number;
  pendingTravelMinorUnits: number;
  paidMinorUnits: number;
}

export function summariseEarnings(lines: readonly EarningLine[]): EarningsSummary {
  const pending = lines.filter((l) => l.state === 'pending');
  const paid = lines.filter((l) => l.state === 'paid');

  const total = (rows: readonly EarningLine[]) =>
    rows.reduce((sum, row) => sum + row.baseMinorUnits + row.travelMinorUnits, 0);

  return {
    pendingMinorUnits: total(pending),
    pendingCount: pending.length,
    pendingTravelMinorUnits: pending.reduce((sum, row) => sum + row.travelMinorUnits, 0),
    paidMinorUnits: total(paid),
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
  if (summary.pendingTravelMinorUnits > 0) {
    parts.push(`incl. ${formatMoney(summary.pendingTravelMinorUnits)} travel uplift`);
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
