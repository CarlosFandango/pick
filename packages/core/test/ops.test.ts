import { describe, expect, it } from 'vitest';
import {
  isOverdue,
  OPS_PRESENTATION,
  type OpsItem,
  type OpsItemKind,
  opsLede,
  waitingFor,
} from '../src/ops';

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

  it('sends each action somewhere specific', () => {
    expect(OPS_PRESENTATION.review_gate.href(item())).toBe('/admin/review/abc');
    expect(OPS_PRESENTATION.vetting.href(item({ kind: 'vetting', targetId: null }))).toBe(
      '/admin/auditors',
    );
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

const NOW = new Date('2026-08-30T09:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

/**
 * Waiting-times relative to NOW. The fixture above is fixed months in the
 * past, which is fine for presentation but makes everything overdue here.
 */
const recent = (over: Partial<OpsItem> = {}): OpsItem => item({ since: hoursAgo(6), ...over });

describe("PICK's day, in one line", () => {
  it('says so plainly when there is nothing to do', () => {
    const lede = opsLede([], NOW);
    expect(lede.tone).toBe('clear');
    expect(lede.headline).toBe('Nothing needs a person right now.');
  });

  it('counts what needs a person, and names the worst of it', () => {
    const lede = opsLede([recent({ since: hoursAgo(60) }), recent({ kind: 'complaint' })], NOW);
    expect(lede.headline).toBe('Two things need a person today. One is overdue.');
    expect(lede.detail).toContain('PS-001231');
  });

  it('does not manufacture a reason when nothing is overdue', () => {
    const lede = opsLede([recent(), recent({ kind: 'complaint' })], NOW);
    expect(lede.headline).toBe('Two things need a person today.');
    expect(lede.detail).toBe('');
  });

  it('measures overdue per kind, because the clocks are different', () => {
    // Two days on a write-up is late. Two days on a complaint is inside the
    // window we tell a charity we will answer in.
    const twoDays = hoursAgo(50);
    expect(isOverdue(recent({ kind: 'review_gate', since: twoDays }), NOW)).toBe(true);
    expect(isOverdue(recent({ kind: 'complaint', since: twoDays }), NOW)).toBe(false);
  });

  it('does not call something overdue when we do not know how long it has waited', () => {
    expect(isOverdue(recent({ since: null }), NOW)).toBe(false);
  });
});
