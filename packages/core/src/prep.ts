import { AUDIT_MOMENTS, type AuditMoment, momentOrder } from './moments';

export interface PrepCard {
  id: string;
  moment: AuditMoment;
  prompt: string;
  guidance?: string | null;
  sortOrder: number;
}

export interface MomentProgress {
  moment: AuditMoment;
  cards: PrepCard[];
  learnt: number;
  total: number;
  /** The first card in this moment the auditor has not marked as learnt. */
  nextCard: PrepCard | null;
}

export interface PrepPlan {
  moments: MomentProgress[];
  learnt: number;
  total: number;
  /** The moment to work on next — the first one not yet complete. */
  currentMoment: AuditMoment | null;
}

/**
 * Group the catalogue into the sequence an auditor walks, and say where they
 * are in it.
 *
 * Ordered by moment, never by compliance category: the category does not reach
 * the device, and an auditor prepares in the order the shift happens.
 */
export function buildPrepPlan(
  cards: readonly PrepCard[],
  learntIds: ReadonlySet<string>,
): PrepPlan {
  const byMoment = new Map<AuditMoment, PrepCard[]>();
  for (const moment of AUDIT_MOMENTS) byMoment.set(moment, []);

  for (const card of cards) {
    byMoment.get(card.moment)?.push(card);
  }

  const moments: MomentProgress[] = [];
  for (const moment of AUDIT_MOMENTS) {
    const inMoment = [...(byMoment.get(moment) ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    if (inMoment.length === 0) continue;

    moments.push({
      moment,
      cards: inMoment,
      learnt: inMoment.filter((c) => learntIds.has(c.id)).length,
      total: inMoment.length,
      nextCard: inMoment.find((c) => !learntIds.has(c.id)) ?? null,
    });
  }

  const total = moments.reduce((n, m) => n + m.total, 0);
  const learnt = moments.reduce((n, m) => n + m.learnt, 0);

  return {
    moments,
    learnt,
    total,
    currentMoment: moments.find((m) => m.learnt < m.total)?.moment ?? null,
  };
}

/** "CARD 4 OF 7" — position within its moment, one-based. */
export function cardPosition(progress: MomentProgress, card: PrepCard): number {
  return progress.cards.findIndex((c) => c.id === card.id) + 1;
}

export function isPrepComplete(plan: PrepPlan): boolean {
  return plan.total > 0 && plan.learnt === plan.total;
}

/** Sorted for display: the sequence of the shift, never the category. */
export function orderedMoments(plan: PrepPlan): MomentProgress[] {
  return [...plan.moments].sort((a, b) => momentOrder(a.moment) - momentOrder(b.moment));
}
