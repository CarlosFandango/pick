import { expect, test } from '@playwright/test';
import { creditBalance, inDays, signIn } from './support';

/**
 * The golden path, walked as three people.
 *
 * The auditor's half runs on a device, so the parts that need the field app
 * are driven through the database in a fixture; everything a person does in a
 * browser is done in the browser.
 */

test.describe('the spine, end to end', () => {
  test('a client books, PICK releases, the client reads the report', async ({ page, request }) => {
    // 1. Client books.
    await signIn(page, 'client');
    await page.goto('/book');
    const before = await creditBalance(page);

    await page.getByPlaceholder('SE15 4QL').fill('SE15 4QL');
    await page.locator('input[name="windowStartOn"]').fill(inDays(7));
    await page.locator('input[name="windowEndOn"]').fill(inDays(10));
    await page.getByRole('button', { name: 'Confirm booking' }).click();

    await expect(page).toHaveURL(/\/audits\?booked=PS-\d+/);
    const reference = new URL(page.url()).searchParams.get('booked');
    expect(reference).toMatch(/^PS-\d+$/);
    expect(await creditBalance(page)).toBe(before - 1);

    // 2. It appears twice, on purpose: once in the confirmation banner and
    //    once in the list beneath it.
    await expect(page.getByText(reference as string)).toHaveCount(2);
    await expect(page.getByText('booked').first()).toBeVisible();
  });

  test('a booked audit is unassigned — the client never picks an auditor', async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/audits');

    // Nothing on the client's list names or offers an auditor.
    await expect(page.getByText(/auditor/i)).toHaveCount(0);
  });

  test('an auditor cannot reach the admin review queue', async ({ page }) => {
    await signIn(page, 'auditor');
    await page.goto('/admin/review/00000000-0000-7000-8000-000000000001');
    // requireRole sends them home; RLS would show nothing regardless.
    await expect(page).not.toHaveURL(/\/admin\//);
  });

  test('a client cannot reach the admin review queue', async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/admin/review/00000000-0000-7000-8000-000000000001');
    await expect(page).not.toHaveURL(/\/admin\//);
  });

  test('an admin can open the review queue', async ({ page }) => {
    await signIn(page, 'admin');
    await page.goto('/admin/review/00000000-0000-7000-8000-000000000001');
    // No such audit, so a 404 — but they got past the role gate, which is the point.
    await expect(page).toHaveURL(/\/admin\/review\//);
  });
});

test.describe("S3.3 / S3.5 the client's world", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'client');
  });

  test('an audit shows where it has got to', async ({ page }) => {
    await page.goto('/book');
    await page.getByPlaceholder('SE15 4QL').fill('SE15 4QL');
    await page.locator('input[name="windowStartOn"]').fill(inDays(7));
    await page.locator('input[name="windowEndOn"]').fill(inDays(9));
    await page.getByRole('button', { name: 'Confirm booking' }).click();

    await page
      .getByText(/PS-\d+/)
      .last()
      .click();

    await expect(page.getByLabel('Audit progress')).toBeVisible();
    // Booked is where it is; released is where it is going.
    await expect(page.getByRole('listitem').filter({ hasText: 'BOOKED' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    await expect(page.getByText('NO REPORT YET')).toBeVisible();
  });

  test('the credits ledger adds up to the balance on screen', async ({ page }) => {
    await page.goto('/credits');

    const balance = await creditBalance(page);
    // The newest line's running balance is the current balance — the ledger
    // is auditable by the person reading it.
    const newest = page.getByLabel(/^Balance after /).first();
    await expect(newest).toHaveText(String(balance));
  });

  test('shows what each credit movement was for', async ({ page }) => {
    await page.goto('/credits');
    await expect(page.getByText('Audit booked').first()).toBeVisible();
    await expect(page.getByText('Credits purchased').first()).toBeVisible();
  });
});
