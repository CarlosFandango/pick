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
   * Where the action happens. Every one of these must be a route the portal
   * actually serves — four were not, and the queue offered actions that
   * produced a 404 until S4.3+ built the screens behind them. `pnpm
   * check:routes` compares these against the page.tsx files that exist.
   */
  href: (item: OpsItem) => string;
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
    href: (item) => `/admin/audits/${item.targetId}`,
  },
  complaint: {
    chip: 'COMPLAINT',
    tone: 'neutral',
    action: 'Open',
    href: (item) => `/admin/complaints/${item.targetId}`,
  },
  vetting: {
    chip: 'VETTING',
    tone: 'neutral',
    action: 'Vet',
    href: () => '/admin/auditors',
  },
  stale_write_up: {
    chip: 'STALE',
    tone: 'neutral',
    action: 'Nudge',
    href: (item) => `/admin/audits/${item.targetId}`,
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
