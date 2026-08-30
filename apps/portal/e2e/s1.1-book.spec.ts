import { expect, test } from '@playwright/test';
import { creditBalance, fillLocation, inDays, signIn } from './support';

/** S1.1 — Book an audit. */
test.describe('S1.1 book an audit', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/book');
  });

  test('shows the charity and its credits, always', async ({ page }) => {
    // The design note on S1.1 is explicit that the count never leaves the screen.
    await expect(page.getByText("St Luke's Hospice")).toBeVisible();
    expect(await creditBalance(page)).toBeGreaterThan(0);
  });

  test('offers the four audit types with street selected', async ({ page }) => {
    for (const label of ['Street', 'Door-to-door', 'Private site', 'Lottery']) {
      await expect(page.getByRole('button', { name: label })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Street' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('never offers a choice of auditor', async ({ page }) => {
    // "No auditor choice anywhere" — assignment is the system's job, and a
    // client who picks their own auditor is not running a covert audit.
    //
    // Asserted as the absence of an AUDITOR control, not of controls. This
    // used to forbid every `select` on the form, which was a fair proxy while
    // the form had none; the place picker is a select, so the proxy started
    // failing for a reason that has nothing to do with the rule.
    const form = page.locator('form');
    await expect(form.locator('[name*="auditor" i]')).toHaveCount(0);
    await expect(form.getByRole('combobox', { name: /auditor/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /choose|pick|select/i })).toHaveCount(0);
  });

  test('lets the audit type be changed', async ({ page }) => {
    await page.getByRole('button', { name: 'Door-to-door' }).click();
    await expect(page.getByRole('button', { name: 'Door-to-door' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: 'Street' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('refuses a window shorter than three days, and spends nothing', async ({ page }) => {
    const before = await creditBalance(page);

    await fillLocation(page);
    await page.locator('input[name="windowStartOn"]').fill(inDays(7));
    await page.locator('input[name="windowEndOn"]').fill(inDays(8));
    await page.getByRole('button', { name: 'Confirm booking' }).click();

    // Scoped to the form: Next's route announcer is also role="alert".
    await expect(page.locator('form').getByRole('alert')).toContainText(/at least three days/i);
    expect(await creditBalance(page)).toBe(before);
  });

  test('books an audit and spends exactly one credit', async ({ page }) => {
    const before = await creditBalance(page);

    await fillLocation(page);
    await page.locator('input[name="windowStartOn"]').fill(inDays(7));
    await page.locator('input[name="windowEndOn"]').fill(inDays(9));
    await page.getByRole('button', { name: 'Confirm booking' }).click();

    await expect(page).toHaveURL(/\/audits\?booked=PS-\d+/);
    await expect(page.getByText(/Booked as/)).toBeVisible();
    expect(await creditBalance(page)).toBe(before - 1);
  });

  test('refuses to book without saying where', async ({ page }) => {
    // This used to assert that a malformed POSTCODE was rejected. There is no
    // postcode rule any more, and there should not be: the regex behind it
    // rejected a Dublin address on insert, which is the whole reason coverage
    // moved to places. What has to hold now is that an audit cannot be booked
    // with nowhere to send an auditor.
    await page.locator('input[name="windowStartOn"]').fill(inDays(7));
    await page.locator('input[name="windowEndOn"]').fill(inDays(9));
    await page.getByRole('button', { name: 'Confirm booking' }).click();

    await expect(page).toHaveURL(/\/book/);
  });
});

test.describe('access', () => {
  test('sends a signed-out visitor to sign in', async ({ page }) => {
    await page.goto('/book');
    await expect(page).toHaveURL(/sign-in/);
  });

  test('keeps an auditor out of the client portal', async ({ page }) => {
    await signIn(page, 'auditor');
    await page.goto('/book');
    // requireRole sends them home; RLS would empty the page regardless.
    await expect(page).not.toHaveURL(/\/book/);
  });
});

test.describe('S3.1 booking deepened', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/book');
  });

  // The A/V toggle used to be asserted here. It is now behind the
  // `avEvidence` flag, which is off because nothing fulfils it — see
  // booking-clarity.spec.ts, which asserts it is absent, and
  // packages/core/test/features.test.ts, which keeps the flag deliberate.

  test('will not submit a window that starts too soon', async ({ page }) => {
    // A window opening tomorrow is effectively a date, which defeats the
    // audit. The `min` attribute stops the browser submitting it at all, so
    // the assertion is that nothing happens — the server-side rule is covered
    // by the integration tests, which is where it actually has to hold.
    await fillLocation(page);
    await page.locator('input[name="windowStartOn"]').fill(inDays(1));
    await page.locator('input[name="windowEndOn"]').fill(inDays(4));
    await page.getByRole('button', { name: 'Confirm booking' }).click();

    await expect(page).toHaveURL(/\/book/);
    const valid = await page
      .locator('input[name="windowStartOn"]')
      .evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(valid).toBe(false);
  });

  test('will not let a date before the lead time be picked at all', async ({ page }) => {
    const min = await page.locator('input[name="windowStartOn"]').getAttribute('min');
    expect(min).toBe(inDays(5));
  });
});
