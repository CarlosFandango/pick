import { describe, expect, it } from 'vitest';
import { encounterSequence, type ReportableFinding, reportLede, waitingLede } from '../src/lede';

const finding = (over: Partial<ReportableFinding> = {}): ReportableFinding => ({
  code: 'OPN-02',
  moment: 'opening',
  finding: 'Did not say they were paid, or name the agency.',
  rationale: 'Somebody being asked for money has a right to know.',
  isCritical: true,
  ...over,
});

describe('what a charity is told first', () => {
  it('puts a comma before the and when a clause already has one', () => {
    // "…or name the agency and kept asking" parses as a longer list on the
    // first read, every time.
    const v = reportLede(
      [
        finding(),
        finding({ code: 'ASK-01', moment: 'ask', finding: 'Kept asking after a clear refusal.' }),
      ],
      29,
    );
    expect(v.headline).toContain(', and kept asking');
  });

  it('names the breach rather than counting it, when there is one', () => {
    const v = reportLede([finding()], 29);
    expect(v.headline).toBe('Did not say they were paid, or name the agency.');
    expect(v.tone).toBe('breach');
  });

  it('names them in the order the encounter ran, not the order the rows arrived', () => {
    const v = reportLede(
      [
        finding({ code: 'ASK-01', moment: 'ask', finding: 'Kept asking after a clear refusal.' }),
        finding(),
      ],
      29,
    );
    expect(v.headline.indexOf('Did not say')).toBeLessThan(v.headline.indexOf('kept asking'));
  });

  it('joins two breaches into one sentence', () => {
    const v = reportLede(
      [
        finding(),
        finding({ code: 'ASK-01', moment: 'ask', finding: 'Kept asking after a clear refusal.' }),
      ],
      29,
    );
    expect(v.headline).toBe(
      'Did not say they were paid, or name the agency, and kept asking after a clear refusal.',
    );
    expect(v.meta).toBe('2 breaches · action needed');
  });

  it('counts and places them once naming them all would be unreadable', () => {
    const v = reportLede(
      [
        finding(),
        finding({ code: 'ASK-01', moment: 'ask' }),
        finding({ code: 'TAB-01', moment: 'tablet' }),
      ],
      29,
    );
    expect(v.headline).toBe('3 breaches in Opening, Ask and Tablet.');
  });

  it('says so plainly when nothing was wrong', () => {
    const v = reportLede([], 29);
    expect(v.tone).toBe('clear');
    expect(v.headline).toBe('Everything we checked was in order.');
    expect(v.detail).toContain('29 checks');
  });

  it('never leads with a percentage', () => {
    const v = reportLede([finding()], 29);
    expect(`${v.meta} ${v.headline} ${v.detail}`).not.toMatch(/%|\d+\.\d/);
  });

  it('separates a non-critical issue from a breach', () => {
    const v = reportLede([finding({ isCritical: false })], 29);
    expect(v.tone).toBe('attention');
    expect(v.meta).toBe('1 issue · worth a look');
  });

  it('tells them how much was fine, so the breach has a size', () => {
    const v = reportLede([finding()], 29);
    expect(v.detail).toContain('other 28');
  });

  it('names only the critical ones when both kinds are present', () => {
    const v = reportLede(
      [finding(), finding({ code: 'APR-02', moment: 'approach', isCritical: false })],
      29,
    );
    expect(v.headline).toBe('Did not say they were paid, or name the agency.');
    expect(v.meta).toBe('1 breach · action needed');
  });
});

describe('what a charity is told while they wait', () => {
  it('answers "is anything expected of me" rather than naming a status', () => {
    for (const status of ['booked', 'assigned', 'in_progress', 'submitted', 'in_review']) {
      const v = waitingLede({ status, hasAuditor: true });
      expect(v.detail).toContain('Nothing is needed from you');
    }
  });

  it('distinguishes waiting for an auditor from having one', () => {
    expect(waitingLede({ status: 'booked', hasAuditor: false }).meta).toBe('Finding an auditor');
    expect(waitingLede({ status: 'booked', hasAuditor: true }).meta).toBe('Booked in');
  });

  it('treats nobody being there as a finding, not a failure', () => {
    const v = waitingLede({ status: 'no_team_present', hasAuditor: true });
    expect(v.headline).toContain('found no fundraising team');
    expect(v.detail).toContain('credit was returned');
  });

  it('says the credit came back when an audit was cancelled', () => {
    expect(waitingLede({ status: 'cancelled', hasAuditor: false }).detail).toContain('returned');
  });
});

describe('the encounter, in order', () => {
  const checked = new Map([
    ['approach', 4],
    ['opening', 3],
    ['ask', 4],
  ] as const);

  it('keeps the moments that went well, so the bad one has a scale', () => {
    const rows = encounterSequence(checked, [finding()]);
    expect(rows.map((r) => r.label)).toEqual(['Approach', 'Opening', 'Ask']);
    expect(rows[0]?.inOrder).toBe(4);
    expect(rows[1]?.inOrder).toBe(2);
  });

  it('runs in the order the encounter happens, not the order things failed', () => {
    const rows = encounterSequence(checked, [finding({ moment: 'ask' }), finding()]);
    expect(rows.map((r) => r.position)).toEqual([1, 3, 5]);
  });

  it('leaves out moments nothing was checked in', () => {
    const rows = encounterSequence(checked, []);
    expect(rows.map((r) => r.moment)).not.toContain('sign_up');
  });
});
