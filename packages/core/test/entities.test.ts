import { describe, expect, it } from 'vitest';
import { address, auditStatus, parseAuditStatus } from '../src/entities';
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

describe('the address of a shift', () => {
  it.each([
    'SW1A 1AA',
    'Rye Lane, Peckham',
    'Grafton Street, Dublin 2',
    'Alexanderplatz, 10178 Berlin',
  ])('accepts %s, in whatever shape the country writes it', (value) => {
    // The UK postcode regex that used to live here made the product
    // structurally UK-only: it rejected a Dublin address on insert. Matching
    // is on the place now, so this only has to be legible to the auditor who
    // navigates by it.
    expect(address.safeParse(value).success).toBe(true);
  });

  it.each(['', ' ', 'x'])('still refuses %s, which tells nobody anything', (value) => {
    expect(address.safeParse(value).success).toBe(false);
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
