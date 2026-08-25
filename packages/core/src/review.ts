import { type AuditMoment, MOMENT_LABELS, momentOrder } from './moments';
import type { Verdict } from './writeup';

export interface ReviewResult {
  checkId: string;
  moment: AuditMoment;
  momentIndex: number;
  prompt: string;
  verdict: Verdict;
  note?: string | null;
}

export interface ReviewSummary {
  counts: Record<Verdict, number>;
  /** Only what needs reading: fails first, then notes. */
  exceptions: ReviewResult[];
  passCount: number;
  momentCount: number;
}

/**
 * What a reviewer actually reads.
 *
 * A queue item, not an inbox: the passes collapse to a count and the
 * exceptions are listed in full. Forty-three lines saying "pass" is not
 * information, and burying one failure among them is how a failure is missed.
 */
export function reviewSummary(results: readonly ReviewResult[]): ReviewSummary {
  const counts: Record<Verdict, number> = { pass: 0, fail: 0, note: 0 };
  for (const result of results) counts[result.verdict] += 1;

  const order: Record<Verdict, number> = { fail: 0, note: 1, pass: 2 };
  const exceptions = results
    .filter((r) => r.verdict !== 'pass')
    .sort(
      (a, b) =>
        order[a.verdict] - order[b.verdict] || momentOrder(a.moment) - momentOrder(b.moment),
    );

  return {
    counts,
    exceptions,
    passCount: counts.pass,
    momentCount: new Set(results.map((r) => r.moment)).size,
  };
}

/** "04 PITCH" — the moment label a reviewer scans down the left. */
export function momentTag(result: ReviewResult): string {
  return `${String(result.momentIndex).padStart(2, '0')} ${MOMENT_LABELS[result.moment].toUpperCase()}`;
}

/** "43 checks across 8 moments — expand to read" */
export function passesLine(summary: ReviewSummary): string {
  const checks = summary.passCount === 1 ? 'check' : 'checks';
  const moments = summary.momentCount === 1 ? 'moment' : 'moments';
  return `${summary.passCount} ${checks} across ${summary.momentCount} ${moments} — expand to read`;
}

/** "43 PASS · 1 FAIL · 2 NOTES" */
export function countsLine(summary: ReviewSummary): string {
  return (['pass', 'fail', 'note'] as const)
    .filter((v) => summary.counts[v] > 0)
    .map((v) => {
      const label = v === 'note' && summary.counts[v] !== 1 ? 'NOTES' : v.toUpperCase();
      return `${summary.counts[v]} ${label}`;
    })
    .join(' · ');
}
