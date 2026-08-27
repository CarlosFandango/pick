import { describe, expect, it } from 'vitest';
import { OPS_PRESENTATION, type OpsItem, type OpsItemKind, waitingFor } from '../src/ops';

const KINDS: OpsItemKind[] = [
  'offer_expiring',
  'review_gate',
  'no_show',
  'complaint',
  'vetting',
  'stale_write_up',
];

const item = (over: Partial<OpsItem> = {}): OpsItem => ({
  kind: 'review_gate',
  reference: 'PS-001231',
  summary: 'SE15 · street',
  targetId: 'abc',
  since: new Date('2026-03-03T11:00:00Z'),
  ...over,
});

describe('ops presentation', () => {
  it('gives every kind exactly one action', () => {
    // A queue where each line needs a decision about what to do with it is
    // not a queue, it is a second inbox.
    for (const kind of KINDS) {
      const presentation = OPS_PRESENTATION[kind];
      expect(presentation, kind).toBeDefined();
      expect(presentation.action.split(' ')).toHaveLength(1);
    }
  });

  it('names each action as a verb, not a noun', () => {
    expect(OPS_PRESENTATION.offer_expiring.action).toBe('Reassign');
    expect(OPS_PRESENTATION.review_gate.action).toBe('Review');
    expect(OPS_PRESENTATION.vetting.action).toBe('Vet');
  });

  it('keeps no-show out of the urgent tone', () => {
    // Nobody did anything wrong; it just needs processing.
    expect(OPS_PRESENTATION.no_show.tone).toBe('info');
  });

  it('marks only the genuinely time-critical as urgent', () => {
    const urgent = KINDS.filter((k) => OPS_PRESENTATION[k].tone === 'urgent');
    expect(urgent).toEqual(['offer_expiring']);
  });

  it('sends each action to a screen that exists', () => {
    expect(OPS_PRESENTATION.review_gate.href(item())).toBe('/admin/review/abc');
    expect(OPS_PRESENTATION.offer_expiring.href(item({ kind: 'offer_expiring' }))).toBe(
      '/admin/assignment/abc',
    );
  });

  it('sends every kind to a route the portal serves', () => {
    // Four of these used to point at screens nobody had built, so the queue
    // offered an action that produced a 404. S4.3+ built them; pnpm
    // check:routes is what keeps this true as the queue grows.
    for (const kind of KINDS) {
      expect(OPS_PRESENTATION[kind].href(item({ kind }))).toMatch(/^\/admin\//);
    }
  });
});

describe('waitingFor', () => {
  const now = new Date('2026-03-03T14:00:00Z');

  it('says how long it has been sitting there', () => {
    expect(waitingFor(item(), now)).toBe('3h');
    expect(waitingFor(item({ since: new Date('2026-03-01T10:00:00Z') }), now)).toBe('2d');
    expect(waitingFor(item({ since: new Date('2026-03-03T13:45:00Z') }), now)).toBe('just now');
  });

  it('says nothing when there is no timestamp to go on', () => {
    expect(waitingFor(item({ since: null }), now)).toBe('');
  });
});
