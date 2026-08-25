import type { AuditStatus } from './entities';

/**
 * How a status should look, in roles rather than colours.
 *
 * `fail` is reserved for things that actually went wrong. It is deliberately
 * unreachable from a status: an audit can be cancelled or find nobody there,
 * and neither is the auditor's failure.
 */
export type StatusTone = 'neutral' | 'progress' | 'good' | 'info';

export interface StatusChip {
  label: string;
  tone: StatusTone;
}

/** What the auditor sees on their own list. */
export const AUDITOR_STATUS: Record<AuditStatus, StatusChip> = {
  draft: { label: 'DRAFT', tone: 'neutral' },
  booked: { label: 'BOOKED', tone: 'neutral' },
  assigned: { label: 'WRITE-UP DUE', tone: 'neutral' },
  in_progress: { label: 'WRITE-UP DUE', tone: 'neutral' },
  in_review: { label: 'IN REVIEW', tone: 'progress' },
  released: { label: 'APPROVED', tone: 'good' },
  // Navy, the same family as assigned — deliberately far from fail-red. The
  // auditor travelled and waited; nobody was there. That is not their failure.
  no_team_present: { label: 'NO TEAM PRESENT', tone: 'info' },
  cancelled: { label: 'CANCELLED', tone: 'neutral' },
};

/** What the client sees. Same states, their language. */
export const CLIENT_STATUS: Record<AuditStatus, StatusChip> = {
  draft: { label: 'DRAFT', tone: 'neutral' },
  booked: { label: 'BOOKED', tone: 'neutral' },
  assigned: { label: 'ASSIGNED', tone: 'neutral' },
  in_progress: { label: 'IN PROGRESS', tone: 'progress' },
  in_review: { label: 'IN REVIEW', tone: 'progress' },
  released: { label: 'RELEASED', tone: 'good' },
  no_team_present: { label: 'NO TEAM PRESENT', tone: 'info' },
  cancelled: { label: 'CANCELLED', tone: 'neutral' },
};

/** "Tue 3 Mar · £115 · paid in full" — the line under an audit on the list. */
export function auditSubtitle(parts: (string | null | undefined)[]): string {
  return parts.filter((part): part is string => Boolean(part)).join(' · ');
}
