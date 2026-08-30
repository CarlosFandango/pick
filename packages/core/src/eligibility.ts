import type { Lede } from './lede';

/**
 * The six tests an auditor has to pass before an audit can be offered to them.
 *
 * They are PARALLEL, not a sequence — there is no chronology here and no
 * verdict-then-timeline to read down, which is why the assignment console is
 * the one screen in the drop that gets a table rather than a rail. Forcing a
 * timeline onto six independent conditions would be worse than the flat list
 * it replaced.
 *
 * What the design work is actually for: making the columns legible so the
 * FIRST FAILING one is visible across the whole pool. Five auditors each
 * failing the same column is a fact about the network — nobody covers this
 * place, or nobody is signed off for this methodology — and it was invisible
 * when each row read as its own sentence.
 */
export const ELIGIBILITY_TESTS = [
  'approved',
  'reachable',
  'capable',
  'available',
  'exposure_ok',
  'no_conflict',
] as const;

export type EligibilityTest = (typeof ELIGIBILITY_TESTS)[number];

export const TEST_LABELS: Record<EligibilityTest, string> = {
  approved: 'Approved',
  reachable: 'Reachable',
  capable: 'Capable',
  available: 'Available',
  exposure_ok: 'Exposure',
  no_conflict: 'Conflict',
};

/** What a failure in this column means, and what would clear it. */
export const TEST_FAILURES: Record<EligibilityTest, { says: string; plural: string; fix: string }> =
  {
    approved: { says: 'Not vetted', plural: 'have not been vetted', fix: 'vetting them' },
    reachable: {
      says: 'Out of reach',
      plural: 'do not cover this place',
      fix: "widening somebody's travel",
    },
    capable: {
      says: 'Not signed off',
      plural: 'are not signed off for this methodology',
      fix: 'signing an approved auditor off for this methodology',
    },
    available: {
      says: 'Committed',
      plural: 'are already committed in this window',
      fix: 'moving the window',
    },
    exposure_ok: {
      says: 'Seen recently',
      plural: 'have audited this charity too recently',
      fix: 'accepting the exposure and overriding',
    },
    no_conflict: {
      says: 'Conflicted',
      plural: 'have declared a conflict',
      fix: 'nothing — a declared conflict is not overridable',
    },
  };

export interface Considered {
  eligible: boolean;
  approved: boolean;
  reachable: boolean;
  capable: boolean;
  available: boolean;
  exposureOk: boolean;
  noConflict: boolean;
}

export function passes(row: Considered, test: EligibilityTest): boolean {
  switch (test) {
    case 'approved':
      return row.approved;
    case 'reachable':
      return row.reachable;
    case 'capable':
      return row.capable;
    case 'available':
      return row.available;
    case 'exposure_ok':
      return row.exposureOk;
    case 'no_conflict':
      return row.noConflict;
  }
}

/**
 * Which single change would open the pool up most.
 *
 * The column that the largest number of otherwise-fine auditors fail. An
 * operator with nobody eligible needs one thing to go and do, not six.
 */
export function nearestFix(rows: readonly Considered[]): EligibilityTest | null {
  const blocked = rows.filter((row) => !row.eligible);
  if (blocked.length === 0) return null;

  let best: { test: EligibilityTest; count: number } | null = null;
  for (const test of ELIGIBILITY_TESTS) {
    // A conflict is a hard block by design, so it is never the nearest fix —
    // suggesting it would be suggesting we override independence.
    if (test === 'no_conflict') continue;
    const count = blocked.filter((row) => !passes(row, test)).length;
    if (count > 0 && (!best || count > best.count)) best = { test, count };
  }
  return best?.test ?? null;
}

export function assignmentLede(rows: readonly Considered[], offered: number): Lede {
  const eligible = rows.filter((row) => row.eligible).length;
  const blocked = rows.length - eligible;

  if (eligible > 0) {
    return {
      tone: 'clear',
      meta: `${eligible} of ${rows.length} eligible`,
      headline:
        offered > 0
          ? `${offered === 1 ? 'One auditor has' : `${offered} auditors have`} been offered this.`
          : `${eligible === 1 ? 'One auditor can' : `${eligible} auditors can`} take this.`,
      detail:
        blocked > 0
          ? `${blocked} ${blocked === 1 ? 'is' : 'are'} ruled out. The columns below say which test each one failed.`
          : '',
    };
  }

  const fix = nearestFix(rows);
  const failing = fix ? rows.filter((row) => !passes(row, fix)).length : 0;

  return {
    tone: 'breach',
    meta: 'Nobody eligible',
    headline: 'Nobody on the network can take this audit.',
    detail: fix
      ? `${failing} of the ${rows.length} considered ${TEST_FAILURES[fix].plural}. The nearest fix is ${TEST_FAILURES[fix].fix}.`
      : 'There is nobody on the network to consider.',
  };
}
