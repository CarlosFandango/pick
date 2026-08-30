import { expect, test } from '@playwright/test';
import { signIn } from './support';

/**
 * What the booking form asks, and what it does not promise.
 *
 * Every question here has a reason that is obvious to us and opaque to a
 * fundraising manager booking their first audit. "Payment method on shift"
 * was the one nobody could explain from the screen.
 */
test.describe('S1.1 explaining itself', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/book');
  });

  test('every step can explain itself on demand', async ({ page }) => {
    const steps = [
      'Audit type',
      'Payment method on shift',
      'Where the team is working',
      'Date window',
    ];

    for (const step of steps) {
      const hint = page.getByRole('group').filter({ hasText: step }).first();
      await expect(hint).toBeVisible();
      // Closed until asked: the explanation must not clutter the form.
      await expect(hint).not.toHaveAttribute('open', /.*/);
    }
  });

  test('says what payment method on shift is actually asking', async ({ page }) => {
    const hint = page.getByRole('group').filter({ hasText: 'Payment method on shift' }).first();
    await hint.getByText('Payment method on shift').click();

    await expect(hint).toContainText(/Direct Debit/);
    await expect(hint).toContainText(/one-off/i);
  });

  test('explains why a window rather than a date, since that reads as arbitrary', async ({
    page,
  }) => {
    const hint = page.getByRole('group').filter({ hasText: 'Date window' }).first();
    await hint.getByText('Date window').click();

    await expect(hint).toContainText(/behaves differently/i);
  });

  test('opens with a keyboard, so the explanation is not mouse-only', async ({ page }) => {
    // A hover tooltip would fail this, and would also be unreachable on touch.
    const hint = page.getByRole('group').filter({ hasText: 'Audit type' }).first();
    await hint.locator('summary').focus();
    await page.keyboard.press('Enter');

    await expect(hint).toHaveAttribute('open', /.*/);
  });
});

test.describe('A/V evidence, which does not exist yet', () => {
  test('is not offered at the moment a credit is spent', async ({ page }) => {
    // The pointer entity is modelled and nothing fulfils it. Offering the
    // choice here would tell a charity something untrue as they pay.
    await signIn(page, 'client');
    await page.goto('/book');

    await expect(page.locator('input[name="requiresAv"]')).toHaveCount(0);
    await expect(page.getByText(/video|audio|A\/V/i)).toHaveCount(0);
  });
});

test.describe('S1.9 reading the audit list', () => {
  test('groups audits by what each group means, not by our status enum', async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/audits');

    // This used to assert five column headings. The list is no longer a table
    // — a fundraising director arrives asking "is anything waiting on me", and
    // reading eight rows of BOOKED / ASSIGNED / IN REVIEW to answer it means
    // knowing our vocabulary. What has to hold is the grouping, and that only
    // one group ever contains an action.
    // Exact, because "waiting for an auditor" is also the sentence under a
    // row in that group — which is the grouping working, not an ambiguity.
    await expect(page.getByText('Ready for you', { exact: true })).toBeVisible();
    await expect(page.getByText('Waiting for an auditor', { exact: true })).toBeVisible();
  });

  test('opens with what the whole list amounts to', async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/audits');

    // Never a count of rows to interpret. The heading is the answer.
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toContainText(/ready to read|nothing needs you|no audits/i);
  });

  test('says where each audit has got to in words, never colour alone', async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/audits');

    // The brand's pass-teal and fail-red are near-identical in greyscale, so a
    // state that is only a colour is a state half the readers cannot read.
    const states = page.getByText(/Released|Being checked|Being worked|Booked|No team/);
    expect(await states.count()).toBeGreaterThan(0);
  });
});

test.describe('S3.5 running out of credits', () => {
  test('tells a charity how to get more instead of stopping dead', async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/credits');

    await expect(page.getByRole('heading', { name: 'Buying credits' })).toBeVisible();

    // The price list comes from credit_bundle, so this proves the query, the
    // policy that lets a client read it, and the seed — not just the markup.
    // Scoped to the bundle table: the ledger below it also prices in pounds,
    // and £175 legitimately appears there as what a past credit cost.
    const prices = page.getByRole('table').filter({ hasText: 'The more you buy' });
    await expect(prices.getByRole('cell', { name: '£250' })).toBeVisible();
    await expect(prices.getByRole('cell', { name: '£750 · £187.50 each' })).toBeVisible();

    // The superseded figure, asserted absent from the PRICE LIST — the thing a
    // charity reads when deciding what to spend. It was asserted absent from
    // the whole page, which stopped being right when the ledger below started
    // showing what each past credit actually cost: £175 is a true statement
    // about a purchase made at the old price, and hiding it would be the bug.
    await expect(prices.getByText('£175')).toHaveCount(0);
  });
});
