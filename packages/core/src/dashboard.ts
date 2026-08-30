import type { AuditStatus } from './entities';
import type { Lede } from './lede';

/**
 * A charity's list of audits, grouped by what each group means to them.
 *
 * The list was ordered by `created_at` and labelled with the status enum, so a
 * director had to read eight rows and know our vocabulary to answer the only
 * question they arrived with: is anything waiting on me?
 *
 * These four groups answer it by construction. Exactly one of them ever
 * contains an action; the other three exist to stop somebody worrying, which
 * is a real job for a screen even though nothing is clickable in it.
 */
export type AuditGroup = 'ready' | 'underway' | 'waiting' | 'finished';

export const GROUP_LABELS: Record<AuditGroup, string> = {
  ready: 'Ready for you',
  underway: 'Under way',
  waiting: 'Waiting for an auditor',
  finished: 'Finished',
};

/**
 * Which group a status falls in.
 *
 * `released` splits: a report nobody has opened is the only thing on this
 * screen that wants a person, and once it has been read it is history. The
 * split is by `readAt`, not by status, because the status is the same either
 * way — see `groupOf`.
 */
export function groupOf(input: { status: AuditStatus; readAt?: string | null }): AuditGroup {
  switch (input.status) {
    case 'released':
      return input.readAt ? 'finished' : 'ready';
    case 'in_progress':
    case 'in_review':
      return 'underway';
    case 'assigned':
      return 'underway';
    case 'booked':
    case 'draft':
      return 'waiting';
    case 'no_team_present':
    case 'cancelled':
      return 'finished';
  }
}

/** The order the groups are read in: what needs you, then what does not. */
export const GROUP_ORDER: AuditGroup[] = ['ready', 'underway', 'waiting', 'finished'];

export interface GroupedAudits<T> {
  group: AuditGroup;
  label: string;
  audits: T[];
}

export function groupAudits<T extends { status: AuditStatus; readAt?: string | null }>(
  audits: readonly T[],
): GroupedAudits<T>[] {
  return GROUP_ORDER.flatMap((group) => {
    const inGroup = audits.filter((a) => groupOf(a) === group);
    if (inGroup.length === 0) return [];
    return [{ group, label: GROUP_LABELS[group], audits: inGroup }];
  });
}

/** "Two audits are booked and waiting for a date, three are being worked." */
function clause(n: number, singular: string, plural: string): string | null {
  if (n === 0) return null;
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * What the whole list amounts to, in a sentence.
 *
 * The answer is almost always "nothing needs you", and saying so is the point:
 * a charity that has to count rows to work that out is doing our job.
 */
export function dashboardLede(counts: Record<AuditGroup, number>): Lede {
  const { ready, underway, waiting } = counts;

  const background = [
    clause(waiting, 'audit is booked and waiting for an auditor', 'audits are booked and waiting for an auditor'),
    clause(underway, 'is being worked or checked', 'are being worked or checked'),
  ]
    .filter(Boolean)
    .join(', ');

  if (ready > 0) {
    return {
      tone: 'clear',
      meta: ready === 1 ? '1 report ready' : `${ready} reports ready`,
      headline:
        ready === 1
          ? 'One report is ready to read. Nothing else needs you.'
          : `${ready} reports are ready to read. Nothing else needs you.`,
      detail: background ? `${capitalise(background)}.` : '',
    };
  }

  if (underway + waiting === 0) {
    return {
      tone: 'waiting',
      meta: 'Nothing booked',
      headline: 'You have no audits booked.',
      detail: 'Book one and we will match it to an auditor who covers the area.',
    };
  }

  return {
    tone: 'waiting',
    meta: 'Nothing needs you',
    headline: 'Nothing needs you right now.',
    detail: background ? `${capitalise(background)}. We will tell you when a report is ready.` : '',
  };
}

function capitalise(sentence: string): string {
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
