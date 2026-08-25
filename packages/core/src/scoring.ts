import type { CheckDefinition, CheckOutcome } from './entities';
import { COMPLIANCE_CATEGORIES, type ComplianceCategory } from './moments';

/** The subset of a CheckResult row that scoring needs. */
export interface ScorableResult {
  id: string;
  check_definition_id: string;
  outcome: CheckOutcome;
  occurred_at: string;
}

export interface Tally {
  earned: number;
  possible: number;
  /** null when nothing was scorable — 0/0 is "no data", not "zero percent". */
  percentage: number | null;
}

export interface CategoryScore extends Tally {
  category: ComplianceCategory;
  criticalFailures: string[];
}

export interface AuditScore {
  overall: Tally;
  categories: CategoryScore[];
  /** Codes of failed critical checks. A charity needs these before the total. */
  criticalFailures: string[];
  /** Recorded but unscored — see the NOTE verdict. */
  notes: number;
}

/**
 * CheckResult is append-only, so a correction arrives as another row for the
 * same check. The auditor's last word wins: latest `occurred_at`, and where two
 * share a timestamp, the larger id.
 *
 * The id tie-break is chronological rather than arbitrary because field events
 * carry device-minted UUIDv7s, and that generator is monotonic within a
 * millisecond. Server-minted v7s are not, so do not rely on this for rows the
 * database created.
 */
export function latestResults(results: readonly ScorableResult[]): ScorableResult[] {
  const latest = new Map<string, ScorableResult>();

  for (const result of results) {
    const held = latest.get(result.check_definition_id);
    if (!held || isNewer(result, held)) {
      latest.set(result.check_definition_id, result);
    }
  }

  return [...latest.values()];
}

function isNewer(candidate: ScorableResult, held: ScorableResult): boolean {
  if (candidate.occurred_at !== held.occurred_at) {
    return candidate.occurred_at > held.occurred_at;
  }
  return candidate.id > held.id;
}

function tally(earned: number, possible: number): Tally {
  return {
    earned,
    possible,
    percentage: possible === 0 ? null : Math.round((earned / possible) * 1000) / 10,
  };
}

/**
 * Score an audit against the catalogue version it was run under.
 *
 * A NOTE leaves the denominator alone — an auditor who wants something on the
 * record must not drag the score down by saying it.
 */
export function scoreAudit(
  definitions: readonly CheckDefinition[],
  results: readonly ScorableResult[],
): AuditScore {
  const byId = new Map(definitions.map((d) => [d.id, d]));
  const buckets = new Map<
    ComplianceCategory,
    { earned: number; possible: number; critical: string[] }
  >(COMPLIANCE_CATEGORIES.map((c) => [c, { earned: 0, possible: 0, critical: [] }]));

  let earned = 0;
  let possible = 0;
  let notes = 0;
  const criticalFailures: string[] = [];

  for (const result of latestResults(results)) {
    const definition = byId.get(result.check_definition_id);
    // A result for a check outside this catalogue version is not scorable.
    if (!definition) continue;

    // NOTE records something worth saying without calling it a breach. It is
    // deliberately outside the score: observations and verdicts are separate
    // layers, and a note must never quietly become a fail.
    if (result.outcome === 'note') {
      notes += 1;
      continue;
    }

    const bucket = buckets.get(definition.compliance_category);
    if (!bucket) continue;

    possible += definition.weight;
    bucket.possible += definition.weight;

    if (result.outcome === 'pass') {
      earned += definition.weight;
      bucket.earned += definition.weight;
    } else if (definition.is_critical) {
      criticalFailures.push(definition.code);
      bucket.critical.push(definition.code);
    }
  }

  const categories: CategoryScore[] = [...buckets.entries()].map(([category, b]) => ({
    category,
    ...tally(b.earned, b.possible),
    criticalFailures: b.critical,
  }));

  return {
    overall: tally(earned, possible),
    categories,
    criticalFailures,
    notes,
  };
}
