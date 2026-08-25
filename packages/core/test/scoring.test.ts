import { describe, expect, it } from 'vitest';
import type { CheckDefinition } from '../src/entities';
import { latestResults, type ScorableResult, scoreAudit } from '../src/scoring';

let seq = 0;
const id = (n: number) => `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`;

function def(over: Partial<CheckDefinition> = {}): CheckDefinition {
  seq += 1;
  return {
    id: id(seq),
    code: `CHK-${seq}`,
    version: 1,
    moment: 'ask',
    compliance_category: 'pressure_and_persistence',
    prompt: 'prompt',
    guidance: null,
    weight: 1,
    is_critical: false,
    sort_order: 0,
    ...over,
  };
}

function result(d: CheckDefinition, over: Partial<ScorableResult> = {}): ScorableResult {
  seq += 1;
  return {
    id: id(seq),
    check_definition_id: d.id,
    outcome: 'pass',
    occurred_at: '2026-08-25T10:00:00.000Z',
    ...over,
  };
}

describe('latestResults', () => {
  it('keeps the newest row per check, because corrections are appended', () => {
    const d = def();
    const first = result(d, { outcome: 'fail', occurred_at: '2026-08-25T10:00:00.000Z' });
    const correction = result(d, { outcome: 'pass', occurred_at: '2026-08-25T10:05:00.000Z' });

    expect(latestResults([first, correction])).toEqual([correction]);
    // Order of arrival must not matter — sync batches are unordered.
    expect(latestResults([correction, first])).toEqual([correction]);
  });

  it('breaks a timestamp tie on the id, which is time-ordered', () => {
    const d = def();
    const at = '2026-08-25T10:00:00.000Z';
    const lower = result(d, { id: id(1), outcome: 'fail', occurred_at: at });
    const higher = result(d, { id: id(2), outcome: 'pass', occurred_at: at });

    expect(latestResults([higher, lower])).toEqual([higher]);
  });

  it('keeps one row per distinct check', () => {
    const a = def();
    const b = def();
    expect(latestResults([result(a), result(b)])).toHaveLength(2);
  });
});

describe('scoreAudit', () => {
  it('weights passes and ignores failures in the numerator', () => {
    const heavy = def({ weight: 3 });
    const light = def({ weight: 1 });

    const score = scoreAudit(
      [heavy, light],
      [result(heavy, { outcome: 'pass' }), result(light, { outcome: 'fail' })],
    );

    expect(score.overall).toEqual({ earned: 3, possible: 4, percentage: 75 });
  });

  it('excludes not_applicable and not_observed from the denominator', () => {
    const scored = def({ weight: 2 });
    const skipped = def({ weight: 5 });
    const unseen = def({ weight: 5 });

    const score = scoreAudit(
      [scored, skipped, unseen],
      [
        result(scored, { outcome: 'pass' }),
        result(skipped, { outcome: 'not_applicable' }),
        result(unseen, { outcome: 'not_observed' }),
      ],
    );

    expect(score.overall).toEqual({ earned: 2, possible: 2, percentage: 100 });
    expect(score.notApplicable).toBe(1);
    expect(score.notObserved).toBe(1);
  });

  it('reports no percentage rather than zero when nothing was scorable', () => {
    const d = def();
    const score = scoreAudit([d], [result(d, { outcome: 'not_observed' })]);

    expect(score.overall.percentage).toBeNull();
  });

  it('surfaces critical failures separately from the total', () => {
    const critical = def({ code: 'ASK-01', is_critical: true, weight: 3 });
    const minor = def({ weight: 1 });

    const score = scoreAudit(
      [critical, minor],
      [result(critical, { outcome: 'fail' }), result(minor, { outcome: 'pass' })],
    );

    expect(score.criticalFailures).toEqual(['ASK-01']);
    // A critical failure does not silently zero the score; it sits alongside it.
    expect(score.overall.percentage).toBe(25);
  });

  it('does not flag a critical check that passed', () => {
    const critical = def({ is_critical: true });
    const score = scoreAudit([critical], [result(critical, { outcome: 'pass' })]);

    expect(score.criticalFailures).toEqual([]);
  });

  it('scores each compliance category independently', () => {
    const data = def({ compliance_category: 'data_protection', weight: 1 });
    const pressure = def({ compliance_category: 'pressure_and_persistence', weight: 1 });

    const score = scoreAudit(
      [data, pressure],
      [result(data, { outcome: 'fail' }), result(pressure, { outcome: 'pass' })],
    );

    const byCategory = new Map(score.categories.map((c) => [c.category, c]));
    expect(byCategory.get('data_protection')?.percentage).toBe(0);
    expect(byCategory.get('pressure_and_persistence')?.percentage).toBe(100);
    // Categories with no results report no data, not a zero.
    expect(byCategory.get('safeguarding')?.percentage).toBeNull();
  });

  it('ignores results for checks outside the given catalogue version', () => {
    const known = def();
    const retired = def();

    const score = scoreAudit([known], [result(known), result(retired, { outcome: 'fail' })]);

    expect(score.overall).toEqual({ earned: 1, possible: 1, percentage: 100 });
  });

  it('scores a correction, not the row it replaced', () => {
    const d = def({ weight: 1 });
    const score = scoreAudit(
      [d],
      [
        result(d, { outcome: 'fail', occurred_at: '2026-08-25T10:00:00.000Z' }),
        result(d, { outcome: 'pass', occurred_at: '2026-08-25T10:09:00.000Z' }),
      ],
    );

    expect(score.overall.percentage).toBe(100);
  });
});
