import { describe, expect, it } from 'vitest';
import { assignmentLede, type Considered, nearestFix } from '../src/eligibility';

const auditor = (over: Partial<Considered> = {}): Considered => {
  const row = {
    approved: true,
    reachable: true,
    capable: true,
    available: true,
    exposureOk: true,
    noConflict: true,
    ...over,
  };
  return {
    ...row,
    eligible:
      row.approved && row.reachable && row.capable && row.available && row.exposureOk && row.noConflict,
  };
};

describe('who can take this audit', () => {
  it('says how many can take it when somebody can', () => {
    const lede = assignmentLede([auditor(), auditor({ reachable: false })], 0);
    expect(lede.tone).toBe('clear');
    expect(lede.headline).toBe('One auditor can take this.');
  });

  it('says it has been offered rather than that somebody could take it', () => {
    expect(assignmentLede([auditor()], 1).headline).toBe('One auditor has been offered this.');
  });

  it('names one thing to go and do when nobody is eligible', () => {
    const lede = assignmentLede(
      [auditor({ reachable: false }), auditor({ reachable: false }), auditor({ capable: false })],
      0,
    );
    expect(lede.tone).toBe('breach');
    expect(lede.detail).toContain('do not cover this place');
    expect(lede.detail).toContain("widening somebody's travel");
  });
});

describe('the nearest fix', () => {
  it('is the column the most blocked auditors fail', () => {
    expect(
      nearestFix([auditor({ capable: false }), auditor({ capable: false }), auditor({ available: false })]),
    ).toBe('capable');
  });

  it('is never a conflict, because a declared conflict is not overridable', () => {
    // Suggesting it would be suggesting we override independence, which is
    // the one thing this product is for.
    expect(nearestFix([auditor({ noConflict: false }), auditor({ noConflict: false })])).toBeNull();
  });

  it('is nothing when everybody is eligible', () => {
    expect(nearestFix([auditor(), auditor()])).toBeNull();
  });
});
