import { AUDIT_MOMENTS, type AuditMoment } from './moments';

export type FlagSeverity = 'wrong' | 'note' | 'fine';

export interface MomentMark {
  moment: AuditMoment;
  occurredAt: Date;
}

export interface FlagMark {
  id: string;
  moment: AuditMoment | null;
  severity: FlagSeverity;
  occurredAt: Date;
}

export interface FieldSession {
  startedAt: Date;
  endedAt: Date | null;
  marks: MomentMark[];
  flags: FlagMark[];
}

export function startSession(at: Date): FieldSession {
  // The first moment is stamped on arrival: the shift starts at the approach.
  return {
    startedAt: at,
    endedAt: null,
    marks: [{ moment: 'approach', occurredAt: at }],
    flags: [],
  };
}

/** The moment the auditor is in now — the last one they stamped. */
export function currentMoment(session: FieldSession): AuditMoment | null {
  return session.marks.at(-1)?.moment ?? null;
}

export function isLastMoment(session: FieldSession): boolean {
  return currentMoment(session) === AUDIT_MOMENTS.at(-1);
}

/**
 * Advance to the next moment.
 *
 * Forward only. An auditor cannot go back, because the interaction cannot: a
 * mis-tap is corrected in write-up, where there is time to think, rather than
 * by fiddling with a phone in front of the person being observed.
 */
export function advance(session: FieldSession, at: Date): FieldSession {
  const current = currentMoment(session);
  if (current === null) return { ...session, marks: [{ moment: 'approach', occurredAt: at }] };

  const next = AUDIT_MOMENTS[AUDIT_MOMENTS.indexOf(current) + 1];
  if (!next) return session;

  return { ...session, marks: [...session.marks, { moment: next, occurredAt: at }] };
}

export function flag(session: FieldSession, mark: FlagMark): FieldSession {
  return { ...session, flags: [...session.flags, mark] };
}

export function endSession(session: FieldSession, at: Date): FieldSession {
  return { ...session, endedAt: at };
}

export interface MomentRow {
  moment: AuditMoment;
  index: number;
  state: 'done' | 'current' | 'upcoming';
  occurredAt: Date | null;
  flagCount: number;
}

/** Every moment, in order, with where the auditor has got to. */
export function momentRows(session: FieldSession): MomentRow[] {
  const current = currentMoment(session);
  const stampedAt = new Map(session.marks.map((m) => [m.moment, m.occurredAt]));
  const flagsPerMoment = new Map<AuditMoment, number>();
  for (const f of session.flags) {
    if (f.moment) flagsPerMoment.set(f.moment, (flagsPerMoment.get(f.moment) ?? 0) + 1);
  }

  return AUDIT_MOMENTS.map((moment, index) => ({
    moment,
    index: index + 1,
    state: moment === current ? 'current' : stampedAt.has(moment) ? 'done' : 'upcoming',
    occurredAt: moment === current ? null : (stampedAt.get(moment) ?? null),
    flagCount: flagsPerMoment.get(moment) ?? 0,
  }));
}

/** "00:42:17" — tabular, unambiguous, readable at arm's length. */
export function elapsed(session: FieldSession, now: Date): string {
  const end = session.endedAt ?? now;
  const seconds = Math.max(0, Math.floor((end.getTime() - session.startedAt.getTime()) / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
}

/** "11:41" — when a moment was stamped. */
export function clockTime(at: Date): string {
  return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
}
