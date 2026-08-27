import { expect, test } from '@playwright/test';
import { inDays, signIn } from './support';

/**
 * Getting back out.
 *
 * Every detail page in the portal is reachable and, until this suite existed,
 * none of them had a route back — the header tabs jump to a section, which is
 * not the same thing. A dead end is a bug even when every page on it renders.
 */

/** Books an audit and returns to its detail page. Costs one credit. */
async function bookAndOpen(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/book');
  await page.getByPlaceholder('SE15 4QL').fill('SE15 4QL');
  await page.locator('input[name="windowStartOn"]').fill(inDays(7));
  await page.locator('input[name="windowEndOn"]').fill(inDays(10));
  await page.getByRole('button', { name: 'Confirm booking' }).click();
  await expect(page).toHaveURL(/\/audits\?booked=PS-\d+/);

  const reference = new URL(page.url()).searchParams.get('booked') as string;
  await page.getByText(reference).last().click();
  await expect(page).toHaveURL(/\/audits\/[0-9a-f-]{36}/);
  return reference;
}

test.describe('finding the way back', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'client');
  });

  test('an audit has a way back to the list', async ({ page }) => {
    await bookAndOpen(page);

    await page.getByRole('link', { name: 'All audits' }).click();
    await expect(page).toHaveURL(/\/audits$/);
  });

  test('a report has a way back to its audit', async ({ page }) => {
    await bookAndOpen(page);
    const auditUrl = page.url();

    await page.goto(`${auditUrl.replace('/audits/', '/reports/')}`);
    await page.getByRole('link', { name: 'Back to the audit' }).click();
    await expect(page).toHaveURL(auditUrl);
  });

  test('raising a concern has a way back', async ({ page }) => {
    await page.goto('/complaint');
    await page.getByRole('link', { name: 'All audits' }).click();
    await expect(page).toHaveURL(/\/audits$/);
  });
});

test.describe('a page we cannot find', () => {
  test('keeps the portal around it and offers a way in', async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/no-such-page');

    await expect(page.getByText('PICKSEL')).toBeVisible();
    await expect(page.getByRole('heading', { name: /cannot find that page/i })).toBeVisible();

    await page.getByRole('link', { name: 'Your audits' }).click();
    await expect(page).toHaveURL(/\/audits$/);
  });

  test('does not confirm that another organisation’s audit exists', async ({ page }) => {
    await signIn(page, 'client');
    // A well-formed id nobody owns. RLS makes "not yours" and "not there"
    // indistinguishable, which is correct — the copy must not undo that.
    await page.goto('/audits/00000000-0000-7000-8000-0000000000ff');

    await expect(page.getByRole('heading', { name: /cannot find that page/i })).toBeVisible();
    await expect(page.getByText(/permission|not allowed|forbidden|exists/i)).toHaveCount(0);
  });

  test('renders for a visitor who is not signed in', async ({ page }) => {
    // It reads the session for nothing, so it cannot itself fail or redirect
    // somebody into a loop.
    await page.context().clearCookies();
    await page.goto('/no-such-page');
    await expect(page.getByRole('heading', { name: /cannot find that page/i })).toBeVisible();
  });
});
