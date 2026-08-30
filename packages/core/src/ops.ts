import type { Lede } from './lede';

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
  href: (item: OpsItem) => string;
  /**
   * What this row IS, said as a fact rather than as a category.
   *
   * The chip says which bucket the row is in; this says what has happened.
   * "Write-up waiting on review" is a thing a person can act on without
   * decoding REVIEW GATE first, and PICK is dispatching a mixed queue in one
   * pass rather than working one bucket at a time.
   */
  title: string;
}

/**
 * Every kind has exactly one action, named as a verb.
 *
 * "Reassign", not "manage": a queue where each line needs a decision about
 * what to do with it is not a queue, it is a second inbox.
 */
export const OPS_PRESENTATION: Record<OpsItemKind, OpsPresentation> = {
  offer_expiring: {
    title: 'An offer is about to lapse',
    chip: 'OFFER EXPIRING',
    tone: 'urgent',
    action: 'Reassign',
    href: (item) => `/admin/audits/${item.targetId}`,
  },
  review_gate: {
    title: 'Write-up waiting on review',
    chip: 'REVIEW GATE',
    tone: 'attention',
    action: 'Review',
    href: (item) => `/admin/review/${item.targetId}`,
  },
  no_show: {
    title: 'Nobody was there — needs processing',
    chip: 'NO SHOW',
    tone: 'info',
    action: 'Process',
    href: (item) => `/admin/audits/${item.targetId}`,
  },
  complaint: {
    title: 'A charity has raised a concern',
    chip: 'COMPLAINT',
    tone: 'neutral',
    action: 'Open',
    href: (item) => `/admin/complaints/${item.targetId}`,
  },
  vetting: {
    title: 'An auditor is waiting to be vetted',
    chip: 'VETTING',
    tone: 'neutral',
    action: 'Vet',
    href: () => '/admin/auditors',
  },
  stale_write_up: {
    title: 'A write-up is overdue',
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

/**
 * The day, in one line.
 *
 * The ops home opened with four counters and the queue beneath them, which
 * made the first thing on the screen a number rather than a judgement. Two
 * people running a marketplace need to know whether today is normal before
 * they need to know that six audits are in flight.
 *
 * Note the shape of the sentence: it counts what needs a person and then names
 * the WORST one. A count on its own does not distinguish a quiet day with five
 * routine items from a bad one with an audit nobody will cover.
 */
export function opsLede(items: readonly OpsItem[], now: Date): Lede {
  if (items.length === 0) {
    return {
      tone: 'clear',
      meta: 'Queue empty',
      headline: 'Nothing needs a person right now.',
      detail: 'Everything in flight is with an auditor or a charity.',
    };
  }

  const overdue = items.filter((item) => isOverdue(item, now));
  const count = spellOut(items.length);
  const noun = items.length === 1 ? 'thing needs' : 'things need';

  return {
    tone: overdue.length > 0 ? 'breach' : 'attention',
    meta: overdue.length > 0 ? `${overdue.length} overdue` : `${items.length} waiting`,
    headline:
      overdue.length > 0
        ? `${count} ${noun} a person today. ${
            overdue.length === 1 ? 'One is' : `${spellOut(overdue.length)} are`
          } overdue.`
        : `${count} ${noun} a person today.`,
    // The detail names WHY today is not routine, rather than repeating the
    // top of the queue that sits directly underneath it. When nothing is
    // overdue there is no why, and the sentence stops.
    detail: overdue.length ? `${describe(overdue.slice(0, 2))}.` : '',
  };
}

/**
 * Overdue is per kind, because the clocks are different.
 *
 * A write-up sitting for two days is late; a complaint at two days is inside
 * the acknowledgement window. One threshold across all of them would either
 * cry wolf or hide the thing that matters.
 */
const OVERDUE_HOURS: Record<OpsItemKind, number> = {
  offer_expiring: 12,
  review_gate: 48,
  no_show: 24,
  complaint: 72,
  vetting: 120,
  stale_write_up: 24,
};

export function isOverdue(item: OpsItem, now: Date): boolean {
  if (!item.since) return false;
  const hours = (now.getTime() - item.since.getTime()) / 3_600_000;
  return hours > OVERDUE_HOURS[item.kind];
}

/** "A write-up is overdue on PS-000906, and an offer is about to lapse". */
function describe(items: readonly OpsItem[]): string {
  const parts = items.map((item) => {
    const title = OPS_PRESENTATION[item.kind].title;
    return `${title.charAt(0).toLowerCase()}${title.slice(1)} — ${item.reference}`;
  });
  const joined =
    parts.length > 1 ? `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}` : parts[0];
  return `${(joined ?? '').charAt(0).toUpperCase()}${(joined ?? '').slice(1)}`;
}

function spellOut(n: number): string {
  const words = [
    'No',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
  ];
  return words[n] ?? String(n);
}
