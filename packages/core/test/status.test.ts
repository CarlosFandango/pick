import { describe, expect, it } from 'vitest';
import { auditStatus } from '../src/entities';
import { AUDITOR_STATUS, auditSubtitle, CLIENT_STATUS } from '../src/status';

describe('status chips', () => {
  it('covers every status for both audiences', () => {
    for (const status of auditStatus.options) {
      expect(AUDITOR_STATUS[status], `auditor: ${status}`).toBeDefined();
      expect(CLIENT_STATUS[status], `client: ${status}`).toBeDefined();
    }
  });

  it('never dresses no-team-present as a failure', () => {
    // The auditor travelled and waited; nobody was there. Same chip family as
    // assigned, deliberately far from fail-red.
    expect(AUDITOR_STATUS.no_team_present.tone).toBe('info');
    expect(CLIENT_STATUS.no_team_present.tone).toBe('info');
  });

  it('has no status that reads as a failure at all', () => {
    // `fail` is reserved for checks. An audit being cancelled or finding
    // nobody there is not the auditor failing.
    const tones = [...Object.values(AUDITOR_STATUS), ...Object.values(CLIENT_STATUS)].map(
      (chip) => chip.tone,
    );
    expect(tones).not.toContain('fail');
  });

  it('tells the auditor what they owe, not what the system is doing', () => {
    // "WRITE-UP DUE" is an instruction; "ASSIGNED" is a database state.
    expect(AUDITOR_STATUS.assigned.label).toBe('WRITE-UP DUE');
    expect(CLIENT_STATUS.assigned.label).toBe('ASSIGNED');
  });

  it('calls a released audit approved to the auditor and released to the client', () => {
    expect(AUDITOR_STATUS.released.label).toBe('APPROVED');
    expect(CLIENT_STATUS.released.label).toBe('RELEASED');
  });
});

describe('auditSubtitle', () => {
  it('joins what is there and skips what is not', () => {
    expect(auditSubtitle(['Tue 3 Mar', '£115', 'paid in full'])).toBe(
      'Tue 3 Mar · £115 · paid in full',
    );
    expect(auditSubtitle(['Tue 3 Mar', null, undefined, '£115'])).toBe('Tue 3 Mar · £115');
    expect(auditSubtitle([])).toBe('');
  });
});
