import type { AuditStatus } from './entities';

/**
 * How an audit has gone, as a sequence a person can read down.
 *
 * The audit row already carries every timestamp this needs — matched_at,
 * started_at, submitted_at, released_at and the rest — and no screen was
 * reading them. A charity was shown a status chip, which is the end state with
 * the story removed, and PICK's own situation report was reconstructing the
 * same story inline.
 *
 * Derived, not stored. There is no event table and there should not be one:
 * these timestamps are the record, and a second copy of them is a second
 * thing to keep in step.
 */
export interface TimelineEvent {
  key: string;
  at: string;
  /** "You booked it" — what happened, in the reader's own terms. */
  title: string;
  /** The sentence under it. May be empty. */
  detail: string;
  tone: 'done' | 'now' | 'attention';
}

export interface TimelineInput {
  status: AuditStatus;
  createdAt: string;
  matchedAt?: string | null;
  startedAt?: string | null;
  submittedAt?: string | null;
  returnedAt?: string | null;
  releasedAt?: string | null;
  noTeamPresentAt?: string | null;
  cancelledAt?: string | null;
  reportReadAt?: string | null;
  /** Shapes the wording of the booking event, not whether it appears. */
  windowLabel?: string;
  auditTypeLabel?: string;
}

/**
 * The events, oldest first.
 *
 * Written for the charity. PICK sees more — who accepted, which gates cleared
 * — and that belongs in the ops view, not here: a charity must never be able
 * to piece together an auditor's identity from a sequence of times.
 */
export function auditTimeline(input: TimelineInput): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const push = (
    key: string,
    at: string | null | undefined,
    title: string,
    detail: string,
    tone: TimelineEvent['tone'] = 'done',
  ) => {
    if (at) events.push({ key, at, title, detail, tone });
  };

  push(
    'booked',
    input.createdAt,
    'You booked it',
    [
      'One credit set aside.',
      input.auditTypeLabel && input.windowLabel
        ? `You asked for a ${input.auditTypeLabel.toLowerCase()} audit in the window ${input.windowLabel}.`
        : '',
    ]
      .filter(Boolean)
      .join(' '),
  );

  push(
    'matched',
    input.matchedAt,
    'An auditor took it',
    'One of our approved auditors who covers the area accepted the job.',
  );

  push('started', input.startedAt, 'The shift was audited', 'Our auditor attended and observed.');

  push(
    'no-team',
    input.noTeamPresentAt,
    'Nobody was there',
    'Our auditor attended and found no fundraising team. Your credit was returned.',
    'attention',
  );

  push(
    'submitted',
    input.submittedAt,
    'The write-up came in',
    'Every report is read by PICK before you see it.',
  );

  push(
    'returned',
    input.returnedAt,
    'We asked for more detail',
    'We sent part of the write-up back to the auditor rather than release it as it was.',
    'attention',
  );

  push('released', input.releasedAt, 'Your report was released', 'Ready to read.');
  push('read', input.reportReadAt, 'You read it', '');
  push(
    'cancelled',
    input.cancelledAt,
    'It was cancelled',
    'Your credit was returned to your balance.',
    'attention',
  );

  events.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

  // The last event is only "done" if the audit has actually finished. While it
  // is in flight, the newest thing that happened is where it is now, and the
  // rail should say so rather than implying something else is due to appear.
  const settled =
    input.status === 'released' ||
    input.status === 'cancelled' ||
    input.status === 'no_team_present';
  const last = events[events.length - 1];
  if (last && !settled && last.tone === 'done') last.tone = 'now';

  return events;
}
