import { describe, expect, it } from 'vitest';
import {
  auditStatus,
  checkOutcome,
  parseAuditStatus,
  parseCheckOutcome,
  postcode,
  postcodeArea,
} from '../src/entities';
import { isUuidV7, newId } from '../src/ids';
import { AUDIT_MOMENTS, momentOrder } from '../src/moments';

describe('newId', () => {
  it('mints a valid UUIDv7', () => {
    expect(isUuidV7(newId())).toBe(true);
  });

  it('sorts by creation order, which is what makes latest-wins work', () => {
    const ids = Array.from({ length: 50 }, newId);
    expect([...ids].sort()).toEqual(ids);
  });

  it('does not collide', () => {
    const ids = Array.from({ length: 1000 }, newId);
    expect(new Set(ids).size).toBe(1000);
  });
});

describe('postcode', () => {
  it.each(['SW1A 1AA', 'sw1a1aa', 'M1 1AE', 'EH12 9DN', 'B33 8TH'])('accepts %s', (value) => {
    expect(postcode.safeParse(value).success).toBe(true);
  });

  it.each(['', 'SW1A', '12345', 'LONDON'])('rejects %s', (value) => {
    expect(postcode.safeParse(value).success).toBe(false);
  });
});

describe('postcodeArea', () => {
  it.each([
    ['SW1A 1AA', 'SW'],
    ['sw1a1aa', 'SW'],
    ['M1 1AE', 'M'],
    ['EH12 9DN', 'EH'],
  ])('reduces %s to %s', (input, expected) => {
    expect(postcodeArea(input)).toBe(expected);
  });
});

describe('moments', () => {
  it('runs in the order an interaction actually happens', () => {
    expect(momentOrder('approach')).toBeLessThan(momentOrder('ask'));
    expect(momentOrder('ask')).toBeLessThan(momentOrder('close'));
  });

  it('covers the whole interaction exactly once', () => {
    expect(new Set(AUDIT_MOMENTS).size).toBe(AUDIT_MOMENTS.length);
    expect(AUDIT_MOMENTS.at(0)).toBe('approach');
    expect(AUDIT_MOMENTS.at(-1)).toBe('close');
  });
});

describe('parseAuditStatus', () => {
  it('accepts every status the design defines', () => {
    for (const status of auditStatus.options) {
      expect(parseAuditStatus(status)).toBe(status);
    }
  });

  it('rejects the values the schema invented before the design existed', () => {
    // Postgres cannot drop an enum value, so a CHECK constraint forbids
    // writing these. Seeing one would mean that constraint had been dropped.
    for (const legacy of ['scheduled', 'submitted']) {
      expect(() => parseAuditStatus(legacy)).toThrow(/status_in_pipeline/);
    }
  });

  it('rejects anything else loudly rather than defaulting', () => {
    expect(() => parseAuditStatus('banana')).toThrow();
  });
});

describe('parseCheckOutcome', () => {
  it('accepts the three verdicts the design defines', () => {
    for (const outcome of checkOutcome.options) {
      expect(parseCheckOutcome(outcome)).toBe(outcome);
    }
  });

  it('rejects the verdicts the schema invented before the design existed', () => {
    // Postgres cannot drop an enum value, so these survive in the type and
    // nothing writes them. Seeing one means something started to.
    expect(() => parseCheckOutcome('not_observed')).toThrow(/not_observed/);
    expect(() => parseCheckOutcome('not_applicable')).toThrow(/not_applicable/);
  });

  it('never renders OBS', () => {
    expect(() => parseCheckOutcome('obs')).toThrow();
  });
});
