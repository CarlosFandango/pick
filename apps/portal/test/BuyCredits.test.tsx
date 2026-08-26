import type { CreditBundle } from '@picksel/core';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BuyCredits } from '@/components/BuyCredits';

const BUNDLES: CreditBundle[] = [
  { quantity: 1, priceMinorUnits: 25_000, currency: 'GBP' },
  { quantity: 2, priceMinorUnits: 45_000, currency: 'GBP' },
  { quantity: 4, priceMinorUnits: 75_000, currency: 'GBP' },
];

describe('the credit price list', () => {
  it('shows every bundle with what each audit works out at', () => {
    render(<BuyCredits bundles={BUNDLES} />);

    const table = screen.getByRole('table');
    expect(within(table).getByText('£250')).toBeVisible();
    expect(within(table).getByText('£450 · £225 each')).toBeVisible();
    expect(within(table).getByText('£750 · £187.50 each')).toBeVisible();
  });

  it('never quotes a superseded price', () => {
    // £175 was the figure before Jaz's roadmap set bundle pricing. It is the
    // number most likely to survive in a stray string, and it is on the screen
    // where a charity decides what to spend.
    const { container } = render(<BuyCredits bundles={BUNDLES} />);
    expect(container.textContent).not.toMatch(/£175/);
  });

  it('says how to actually order, rather than offering a button that does nothing', () => {
    render(<BuyCredits bundles={BUNDLES} />);

    expect(screen.getByText(/not available yet/)).toBeVisible();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('still explains how to order when the price list cannot be read', () => {
    // An empty list means the query failed or every bundle was retired. The
    // charity still needs the way out; a bare heading would be a dead end.
    render(<BuyCredits bundles={[]} />);

    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText(/account manager|email/)).toBeVisible();
  });
});
