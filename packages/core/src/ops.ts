export type OpsItemKind =
  | 'offer_expiring'
  | 'review_gate'
  | 'no_show'
  | 'complaint'
  | 'vetting'
  | 'stale_write_up';

export interface OpsItem {
  kind: OpsItemKind;
  reference: string;
  summary: string;
  targetId: string | null;
  since: Date | null;
}

/** Chip label, tone, and the one thing to do about it. */
export interface OpsPresentation {
  chip: string;
  tone: 'urgent' | 'attention' | 'neutral' | 'info';
  action: string;
  /**
   * Where the action happens, or null while that screen does not exist.
   *
   * Four of these pointed at routes nobody had built — /admin/audits/:id,
   * /admin/complaints/:id, /admin/auditors — so the queue offered an action
   * that produced a 404. A queue that lies about what it can do is worse than
   * one that admits the gap: the line still says something needs a human, and
   * the missing screen stays visible instead of looking finished.
   */
  href: (item: OpsItem) => string | null;
}

/**
 * Every kind has exactly one action, named as a verb.
 *
 * "Reassign", not "manage": a queue where each line needs a decision about
 * what to do with it is not a queue, it is a second inbox.
 */
export const OPS_PRESENTATION: Record<OpsItemKind, OpsPresentation> = {
  offer_expiring: {
    chip: 'OFFER EXPIRING',
    tone: 'urgent',
    action: 'Reassign',
    // S4.2. Reassigning is exactly what the assignment console is for.
    href: (item) => `/admin/assignment/${item.targetId}`,
  },
  review_gate: {
    chip: 'REVIEW GATE',
    tone: 'attention',
    action: 'Review',
    href: (item) => `/admin/review/${item.targetId}`,
  },
  no_show: {
    chip: 'NO SHOW',
    tone: 'info',
    action: 'Process',
    // Waiting on the audit admin screen (S4.3+).
    href: () => null,
  },
  complaint: {
    chip: 'COMPLAINT',
    tone: 'neutral',
    action: 'Open',
    // Waiting on complaints admin (S4.3+).
    href: () => null,
  },
  vetting: {
    chip: 'VETTING',
    tone: 'neutral',
    action: 'Vet',
    // Waiting on the auditors screen (S4.3+).
    href: () => null,
  },
  stale_write_up: {
    chip: 'STALE',
    tone: 'neutral',
    action: 'Nudge',
    // Waiting on the audit admin screen (S4.3+).
    href: () => null,
  },
};

/** "held 3h" — how long this has been sitting there. */
export function waitingFor(item: OpsItem, now: Date): string {
  if (!item.since) return '';
  const hours = Math.floor((now.getTime() - item.since.getTime()) / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
