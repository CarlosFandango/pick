import { describe, expect, it } from 'vitest';
import { auditTimeline } from '../src/timeline';

const base = {
  status: 'in_review' as const,
  createdAt: '2026-08-09T09:00:00Z',
  matchedAt: '2026-08-10T11:00:00Z',
  startedAt: '2026-08-22T14:00:00Z',
  submittedAt: '2026-08-22T18:30:00Z',
};

describe('how an audit has gone', () => {
  it('reads in the order things happened', () => {
    const events = auditTimeline(base);
    expect(events.map((e) => e.key)).toEqual(['booked', 'matched', 'started', 'submitted']);
  });

  it('marks where it has got to, so nothing looks overdue that is not', () => {
    const events = auditTimeline(base);
    expect(events[events.length - 1]?.tone).toBe('now');
  });

  it('does not mark a finished audit as still in flight', () => {
    const events = auditTimeline({
      ...base,
      status: 'released',
      releasedAt: '2026-08-24T10:00:00Z',
    });
    expect(events.every((e) => e.tone !== 'now')).toBe(true);
  });

  it('leaves out what has not happened rather than showing it greyed', () => {
    const events = auditTimeline({ status: 'booked', createdAt: base.createdAt });
    expect(events).toHaveLength(1);
  });

  it('says the credit came back when nobody was there', () => {
    const events = auditTimeline({
      status: 'no_team_present',
      createdAt: base.createdAt,
      matchedAt: base.matchedAt,
      noTeamPresentAt: '2026-08-22T14:20:00Z',
    });
    const noTeam = events.find((e) => e.key === 'no-team');
    expect(noTeam?.tone).toBe('attention');
    expect(noTeam?.detail).toContain('credit was returned');
  });

  it('never names the auditor', () => {
    const text = auditTimeline({ ...base, releasedAt: '2026-08-24T10:00:00Z' })
      .map((e) => `${e.title} ${e.detail}`)
      .join(' ');
    expect(text).toMatch(/an auditor|our auditor/i);
    expect(text).not.toMatch(/Auditor \d/);
  });

  it('tells a charity a write-up was sent back, rather than hiding the delay', () => {
    const events = auditTimeline({
      ...base,
      returnedAt: '2026-08-23T09:00:00Z',
    });
    expect(events.find((e) => e.key === 'returned')?.title).toBe('We asked for more detail');
  });
});
