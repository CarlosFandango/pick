import { describe, expect, it } from 'vitest';
import { COMPLAINT_ROUTES, routeFor } from '../src/complaints';

describe('the complaint fork', () => {
  it('offers exactly two routes, because there are two different problems', () => {
    expect(COMPLAINT_ROUTES.map((r) => r.subject)).toEqual(['about_audit', 'about_fundraiser']);
  });

  it('says what happens next before the client writes anything', () => {
    for (const route of COMPLAINT_ROUTES) {
      expect(route.outcome.length).toBeGreaterThan(20);
    }
  });

  it('is clear that PICK is not the complaints body for fundraisers', () => {
    // Burying a regulatory matter in a quality queue is the failure mode this
    // screen exists to prevent.
    expect(routeFor('about_fundraiser').outcome).toMatch(/not the complaints body/i);
    expect(routeFor('about_fundraiser').outcome).toMatch(/regulator/i);
  });

  it('requires an audit only when the complaint is about one', () => {
    expect(routeFor('about_audit').requiresAudit).toBe(true);
    expect(routeFor('about_fundraiser').requiresAudit).toBe(false);
  });

  it('fails loudly on an unknown route rather than picking one', () => {
    expect(() => routeFor('about_weather' as never)).toThrow(/Unknown complaint subject/);
  });
});
