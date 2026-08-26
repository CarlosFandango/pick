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
    const steps = ['Audit type', 'Payment method on shift', 'Postcode of activity', 'Date window'];

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
  test('says what each column is', async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/audits');

    for (const heading of ['Reference', 'Type', 'Location', 'Window', 'Status']) {
      await expect(page.getByRole('columnheader', { name: heading })).toBeVisible();
    }
  });

  test('shows status as a labelled pill, never colour alone', async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/audits');

    // The brand's pass-teal and fail-red are near-identical in greyscale, so a
    // status that is only a colour is a status half the readers cannot read.
    const statuses = page.getByRole('cell').filter({ hasText: /BOOKED|ASSIGNED|IN |RELEASED/ });
    expect(await statuses.count()).toBeGreaterThan(0);
  });
});

test.describe('S3.5 running out of credits', () => {
  test('tells a charity how to get more instead of stopping dead', async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/credits');

    await expect(page.getByRole('heading', { name: 'Buying credits' })).toBeVisible();
    await expect(page.getByText(/invoiced at £175/)).toBeVisible();
  });
});
