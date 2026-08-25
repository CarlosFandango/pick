import { describe, expect, it } from 'vitest';
import type { AuditMoment } from '../src/moments';
import { countsLine, momentTag, passesLine, type ReviewResult, reviewSummary } from '../src/review';
import type { Verdict } from '../src/writeup';

const MOMENT_INDEX: Record<string, number> = { approach: 1, pitch: 4, ask: 5, tablet: 6 };

let seq = 0;
const result = (moment: AuditMoment, verdict: Verdict, note?: string): ReviewResult => {
  seq += 1;
  return {
    checkId: `k${seq}`,
    moment,
    momentIndex: MOMENT_INDEX[moment] ?? 1,
    prompt: `prompt ${seq}`,
    verdict,
    note,
  };
};

describe('reviewSummary', () => {
  it('collapses passes to a count and lists the exceptions in full', () => {
    const summary = reviewSummary([
      result('approach', 'pass'),
      result('approach', 'pass'),
      result('pitch', 'fail', 'Off-script claim'),
      result('ask', 'note', 'Borderline second ask'),
    ]);

    // Forty-three lines saying "pass" is not information, and burying one
    // failure among them is how a failure is missed.
    expect(summary.passCount).toBe(2);
    expect(summary.exceptions).toHaveLength(2);
  });

  it('puts failures before notes', () => {
    const summary = reviewSummary([
      result('tablet', 'note'),
      result('pitch', 'fail'),
      result('ask', 'note'),
    ]);
    expect(summary.exceptions.map((e) => e.verdict)).toEqual(['fail', 'note', 'note']);
  });

  it('orders same-verdict exceptions by when they happened', () => {
    const summary = reviewSummary([result('tablet', 'note'), result('ask', 'note')]);
    expect(summary.exceptions.map((e) => e.moment)).toEqual(['ask', 'tablet']);
  });

  it('counts every verdict', () => {
    const summary = reviewSummary([
      result('approach', 'pass'),
      result('pitch', 'fail'),
      result('ask', 'note'),
      result('tablet', 'note'),
    ]);
    expect(summary.counts).toEqual({ pass: 1, fail: 1, note: 2 });
  });

  it('has no exceptions on a clean audit', () => {
    const summary = reviewSummary([result('approach', 'pass'), result('pitch', 'pass')]);
    expect(summary.exceptions).toEqual([]);
    expect(countsLine(summary)).toBe('2 PASS');
  });

  it('handles an empty write-up without inventing a summary', () => {
    const summary = reviewSummary([]);
    expect(summary.counts).toEqual({ pass: 0, fail: 0, note: 0 });
    expect(countsLine(summary)).toBe('');
  });
});

describe('countsLine', () => {
  it('reads the way the reviewer says it out loud', () => {
    const summary = reviewSummary([
      ...Array.from({ length: 43 }, () => result('approach', 'pass')),
      result('pitch', 'fail'),
      result('ask', 'note'),
      result('tablet', 'note'),
    ]);
    expect(countsLine(summary)).toBe('43 PASS · 1 FAIL · 2 NOTES');
  });

  it('says NOTE in the singular', () => {
    expect(countsLine(reviewSummary([result('ask', 'note')]))).toBe('1 NOTE');
  });
});

describe('momentTag', () => {
  it('numbers and names the moment', () => {
    expect(momentTag(result('pitch', 'fail'))).toBe('04 PITCH');
    expect(momentTag(result('tablet', 'note'))).toBe('06 TABLET');
  });
});

describe('passesLine', () => {
  it('says how much is hidden behind the count', () => {
    const summary = reviewSummary([
      ...Array.from({ length: 43 }, () => result('approach', 'pass')),
      result('pitch', 'fail'),
    ]);
    expect(passesLine(summary)).toBe('43 checks across 2 moments — expand to read');
  });

  it('is grammatical when there is one of each', () => {
    expect(passesLine(reviewSummary([result('approach', 'pass')]))).toBe(
      '1 check across 1 moment — expand to read',
    );
  });
});
