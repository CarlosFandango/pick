import { describe, expect, it } from 'vitest';
import {
  type CreditEntry,
  currentBalance,
  deltaLabel,
  runningBalance,
  valueLabel,
} from '../src/credits';

let seq = 0;
const entry = (over: Partial<CreditEntry> = {}): CreditEntry => {
  seq += 1;
  return {
    id: `e${String(seq).padStart(3, '0')}`,
    delta: 1,
    reason: 'purchase',
    occurredAt: new Date(2026, 2, seq),
    ...over,
  };
};

describe('runningBalance', () => {
  it('shows the balance after every movement', () => {
    const ledger = [
      entry({ delta: 4, reason: 'purchase' }),
      entry({ delta: -1, reason: 'booking' }),
      entry({ delta: 1, reason: 'refund' }),
    ];
    const lines = runningBalance(ledger, currentBalance(ledger));

    // Newest first for reading; the balance still reads down from the top.
    expect(lines.map((l) => l.balanceAfter)).toEqual([4, 3, 4]);
  });

  it('is auditable by the person reading it, not something to trust', () => {
    const ledger = [entry({ delta: 10 }), entry({ delta: -1, reason: 'booking' })];
    const lines = runningBalance(ledger, currentBalance(ledger));
    expect(lines.at(-1)?.balanceAfter).toBe(10);
    expect(lines.at(0)?.balanceAfter).toBe(9);
  });

  it('orders by when things happened, not the order they arrived', () => {
    const later = entry({ delta: -1, reason: 'booking', occurredAt: new Date(2026, 2, 20) });
    const earlier = entry({ delta: 5, occurredAt: new Date(2026, 2, 1) });

    const lines = runningBalance([later, earlier], currentBalance([later, earlier]));
    expect(lines.map((l) => l.id)).toEqual([later.id, earlier.id]);
    expect(lines.at(0)?.balanceAfter).toBe(4);
  });

  it('handles an empty ledger', () => {
    expect(runningBalance([], 0)).toEqual([]);
    expect(currentBalance([])).toBe(0);
  });
});

describe('deltaLabel', () => {
  it('uses a real minus sign, not a hyphen', () => {
    expect(deltaLabel(4)).toBe('+4');
    expect(deltaLabel(-1)).toBe('−1');
  });
});

describe('valueLabel', () => {
  it('prices a purchase', () => {
    expect(valueLabel(entry({ delta: 4, reason: 'purchase', unitPricePence: 17500 }))).toBe('£700');
  });

  it('says nothing for a movement with no money attached', () => {
    // A booking spends a credit that was already paid for. Showing £175
    // against it would double-count what the charity spent.
    expect(valueLabel(entry({ delta: -1, reason: 'booking', unitPricePence: 17500 }))).toBe('');
    expect(valueLabel(entry({ delta: 1, reason: 'refund' }))).toBe('');
  });
});

describe('a paged ledger', () => {
  // The screen shows the most recent movements of a ledger that may be longer.
  // Accumulating from zero would put every figure on it out by the same amount,
  // plausibly, and disagree with the balance every other screen reads from the
  // view.
  const page = [
    entry({ id: 'p001', delta: 4, reason: 'purchase', occurredAt: new Date('2026-08-01') }),
    entry({ id: 'p002', delta: -1, reason: 'booking', occurredAt: new Date('2026-08-02') }),
  ];

  it('reads down from the balance it was given, not from zero', () => {
    // Balance is 20 now; the two movements shown net to +3, so before them it
    // was 17.
    const lines = runningBalance(page, 20);

    expect(lines.map((l) => l.balanceAfter)).toEqual([20, 21]);
  });

  it('ends on the balance the rest of the product shows', () => {
    const lines = runningBalance(page, 20);
    expect(lines[0]?.balanceAfter).toBe(20);
  });

  it('reads down from zero when the caller really does hold the whole ledger', () => {
    const lines = runningBalance(page, currentBalance(page));
    expect(lines.map((l) => l.balanceAfter)).toEqual([3, 4]);
  });
});
