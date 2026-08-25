import { AUDIT_MOMENTS, type AuditMoment } from './moments';

/** PASS | FAIL | NOTE. Never "OBS". */
export type Verdict = 'pass' | 'fail' | 'note';

/** Where a draft has got to. Always labelled on screen — never guessed. */
export type DraftState = 'local' | 'syncing' | 'submitted' | 'returned';

export interface WriteUpCheck {
  id: string;
  moment: AuditMoment;
  prompt: string;
  sortOrder: number;
}

export interface Answer {
  verdict: Verdict;
  note?: string | null;
}

export interface WriteUpMoment {
  moment: AuditMoment;
  index: number;
  checks: WriteUpCheck[];
  answers: Map<string, Answer>;
  complete: boolean;
  counts: Record<Verdict, number>;
  /** Times the auditor flagged something in this moment, from the session. */
  markers: Date[];
  /** A returned write-up unlocks only the moments PICK flagged. */
  editable: boolean;
}

export interface WriteUp {
  moments: WriteUpMoment[];
  state: DraftState;
  momentsRemaining: number;
  canSubmit: boolean;
}

export interface BuildWriteUpInput {
  checks: readonly WriteUpCheck[];
  answers: ReadonlyMap<string, Answer>;
  state?: DraftState;
  markers?: ReadonlyMap<AuditMoment, Date[]>;
  /** Set only when PICK returns a write-up; empty means everything is open. */
  unlockedMoments?: ReadonlySet<AuditMoment>;
}

/**
 * The shift replayed as something to judge.
 *
 * Same sequence as prep and as the field session: an auditor should never have
 * to translate between three different orderings of the same shift.
 */
export function buildWriteUp({
  checks,
  answers,
  state = 'local',
  markers,
  unlockedMoments,
}: BuildWriteUpInput): WriteUp {
  const moments: WriteUpMoment[] = [];

  AUDIT_MOMENTS.forEach((moment, i) => {
    const inMoment = checks
      .filter((c) => c.moment === moment)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (inMoment.length === 0) return;

    const given = new Map<string, Answer>();
    const counts: Record<Verdict, number> = { pass: 0, fail: 0, note: 0 };

    for (const check of inMoment) {
      const answer = answers.get(check.id);
      if (!answer) continue;
      given.set(check.id, answer);
      counts[answer.verdict] += 1;
    }

    moments.push({
      moment,
      index: i + 1,
      checks: inMoment,
      answers: given,
      complete: given.size === inMoment.length,
      counts,
      markers: markers?.get(moment) ?? [],
      // A returned write-up unlocks only what PICK flagged, so the auditor
      // fixes what was wrong rather than re-litigating the whole shift.
      editable:
        state === 'local' || (state === 'returned' && (unlockedMoments?.has(moment) ?? false)),
    });
  });

  const momentsRemaining = moments.filter((m) => !m.complete).length;

  return {
    moments,
    state,
    momentsRemaining,
    // Submit unlocks only when every moment is complete: a partial write-up
    // is not an audit, and PICK cannot review what is not there.
    canSubmit: moments.length > 0 && momentsRemaining === 0 && state !== 'submitted',
  };
}

/** "6 PASS", or the mix when it is not unanimous. */
export function momentSummary(moment: WriteUpMoment): string {
  if (!moment.complete) return 'TO DO';

  const parts = (['fail', 'note', 'pass'] as const)
    .filter((verdict) => moment.counts[verdict] > 0)
    .map((verdict) => `${moment.counts[verdict]} ${verdict.toUpperCase()}`);

  return parts.join(' · ');
}

/** "Submit — 3 moments left", or just "Submit" when it is ready. */
export function submitLabel(writeUp: WriteUp): string {
  if (writeUp.momentsRemaining === 0) return 'Submit';
  const noun = writeUp.momentsRemaining === 1 ? 'moment' : 'moments';
  return `Submit — ${writeUp.momentsRemaining} ${noun} left`;
}

export const DRAFT_LABELS: Record<DraftState, string> = {
  local: 'LOCAL DRAFT',
  syncing: 'SYNCING',
  submitted: 'SUBMITTED',
  returned: 'RETURNED FOR REWORK',
};
