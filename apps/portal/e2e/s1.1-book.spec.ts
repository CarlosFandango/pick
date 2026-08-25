import { expect, test } from '@playwright/test';
import { creditBalance, signIn } from './support';

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
    // Asserted as the absence of a CONTROL, not of the word: the helper text
    // legitimately says "the auditor uses".
    const form = page.locator('form');
    await expect(form.locator('[name*="auditor" i]')).toHaveCount(0);
    await expect(form.locator('select, [role="combobox"], [role="listbox"]')).toHaveCount(0);
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

    await page.getByPlaceholder('SE15 4QL').fill('SE15 4QL');
    await page.locator('input[name="windowStartOn"]').fill('2026-03-03');
    await page.locator('input[name="windowEndOn"]').fill('2026-03-04');
    await page.getByRole('button', { name: 'Confirm booking' }).click();

    // Scoped to the form: Next's route announcer is also role="alert".
    await expect(page.locator('form').getByRole('alert')).toContainText(/at least three days/i);
    expect(await creditBalance(page)).toBe(before);
  });

  test('books an audit and spends exactly one credit', async ({ page }) => {
    const before = await creditBalance(page);

    await page.getByPlaceholder('SE15 4QL').fill('SE15 4QL');
    await page.locator('input[name="windowStartOn"]').fill('2026-03-03');
    await page.locator('input[name="windowEndOn"]').fill('2026-03-05');
    await page.getByRole('button', { name: 'Confirm booking' }).click();

    await expect(page).toHaveURL(/\/audits\?booked=PS-\d+/);
    await expect(page.getByText(/Booked as/)).toBeVisible();
    expect(await creditBalance(page)).toBe(before - 1);
  });

  test('rejects a postcode the schema does not recognise', async ({ page }) => {
    await page.getByPlaceholder('SE15 4QL').fill('NOT A POSTCODE');
    await page.locator('input[name="windowStartOn"]').fill('2026-03-03');
    await page.locator('input[name="windowEndOn"]').fill('2026-03-05');
    await page.getByRole('button', { name: 'Confirm booking' }).click();

    await expect(page.locator('form').getByRole('alert')).toBeVisible();
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
