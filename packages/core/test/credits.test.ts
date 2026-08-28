import { describe, expect, it } from 'vitest';
import {
  bundleLabel,
  type CreditBundle,
  type CreditEntry,
  currentBalance,
  deltaLabel,
  effectiveUnitPrice,
  runningBalance,
  sortBundles,
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
    const lines = runningBalance([
      entry({ delta: 4, reason: 'purchase' }),
      entry({ delta: -1, reason: 'reservation' }),
      entry({ delta: 1, reason: 'refund' }),
    ]);

    // Newest first for reading; the balance still reads down from the top.
    expect(lines.map((l) => l.balanceAfter)).toEqual([4, 3, 4]);
  });

  it('is auditable by the person reading it, not something to trust', () => {
    const lines = runningBalance([
      entry({ delta: 10 }),
      entry({ delta: -1, reason: 'reservation' }),
    ]);
    expect(lines.at(-1)?.balanceAfter).toBe(10);
    expect(lines.at(0)?.balanceAfter).toBe(9);
  });

  it('orders by when things happened, not the order they arrived', () => {
    const later = entry({ delta: -1, reason: 'reservation', occurredAt: new Date(2026, 2, 20) });
    const earlier = entry({ delta: 5, occurredAt: new Date(2026, 2, 1) });

    const lines = runningBalance([later, earlier]);
    expect(lines.map((l) => l.id)).toEqual([later.id, earlier.id]);
    expect(lines.at(0)?.balanceAfter).toBe(4);
  });

  it('handles an empty ledger', () => {
    expect(runningBalance([])).toEqual([]);
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
    expect(valueLabel(entry({ delta: 4, reason: 'purchase', unitPriceMinorUnits: 25_000 }))).toBe(
      '£1,000',
    );
  });

  it('says nothing for a movement with no money attached', () => {
    // A booking spends a credit that was already paid for. Pricing it again
    // here would double-count what the charity spent.
    expect(
      valueLabel(entry({ delta: -1, reason: 'reservation', unitPriceMinorUnits: 25_000 })),
    ).toBe('');
    expect(valueLabel(entry({ delta: 1, reason: 'refund' }))).toBe('');
  });
});

describe('credit bundles', () => {
  const bundle = (quantity: number, priceMinorUnits: number): CreditBundle => ({
    quantity,
    priceMinorUnits,
    currency: 'GBP',
  });

  it('works out what each credit in a bundle cost', () => {
    // The list from Jaz's roadmap. Every one divides exactly, which is why
    // effectiveUnitPrice can stay in integer minor units.
    expect(effectiveUnitPrice(bundle(1, 25_000))).toBe(25_000);
    expect(effectiveUnitPrice(bundle(2, 45_000))).toBe(22_500);
    expect(effectiveUnitPrice(bundle(3, 60_000))).toBe(20_000);
    expect(effectiveUnitPrice(bundle(4, 75_000))).toBe(18_750);
    expect(effectiveUnitPrice(bundle(8, 150_000))).toBe(18_750);
  });

  it('gets cheaper per audit as the bundle grows', () => {
    // The whole point of the price list. If this ever inverts, someone has
    // mistyped a price and a charity is being punished for buying more.
    const list = [
      bundle(1, 25_000),
      bundle(2, 45_000),
      bundle(3, 60_000),
      bundle(4, 75_000),
      bundle(8, 150_000),
    ];

    const unitPrices = sortBundles(list).map(effectiveUnitPrice);
    for (let i = 1; i < unitPrices.length; i++) {
      expect(unitPrices[i], `bundle ${i} is not cheaper per credit`).toBeLessThanOrEqual(
        unitPrices[i - 1] as number,
      );
    }
  });

  it('quotes a single credit as one price, not a price each', () => {
    expect(bundleLabel(bundle(1, 25_000))).toBe('£250');
    expect(bundleLabel(bundle(4, 75_000))).toBe('£750 · £187.50 each');
  });

  it('orders by bundle size, which is how a buyer compares them', () => {
    const list = [bundle(8, 150_000), bundle(1, 25_000), bundle(3, 60_000)];
    expect(sortBundles(list).map((b) => b.quantity)).toEqual([1, 3, 8]);
  });
});

describe('a movement that changes nothing', () => {
  it('reads as no change, not as a debit of zero', () => {
    // A consumption settles a reservation; the credit left at booking. "−0" is
    // correct arithmetic and nonsense as English, on the row that tells a
    // charity they received what they paid for (TND-99).
    expect(deltaLabel(0)).toBe('—');
  });
});
