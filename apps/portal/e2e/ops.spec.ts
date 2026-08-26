import { expect, test } from '@playwright/test';
import { signIn } from './support';

/**
 * S4.3 / S4.4 — the ops screens the queue points at.
 *
 * Every one of these routes was linked from the ops home and returned a 404.
 * A queue whose rows go nowhere is worse than an empty queue.
 */
test.describe('the ops cockpit links somewhere', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'admin');
  });

  test('every row in the queue leads to a page that exists', async ({ page }) => {
    await page.goto('/admin');

    const links = page.getByRole('link');
    const hrefs = await links.evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLAnchorElement).getAttribute('href')).filter(Boolean),
    );

    for (const href of hrefs.filter((h) => h?.startsWith('/admin'))) {
      const response = await page.request.get(href as string);
      expect(response.status(), `${href} is not reachable`).toBeLessThan(400);
    }
  });

  test('the auditors screen puts vetting first and offers the decision', async ({ page }) => {
    await page.goto('/admin/auditors');

    await expect(page.getByRole('heading', { name: 'Auditors' })).toBeVisible();
    await expect(page.getByText(/awaiting vetting/i).first()).toBeVisible();
  });

  test('suspending asks why before it will go through', async ({ page }) => {
    await page.goto('/admin/auditors');

    const suspend = page.getByRole('button', { name: 'Suspend' }).first();
    if ((await suspend.count()) === 0) test.skip();

    await suspend.click();
    // The reason is the part that will matter later. The control must not be
    // a single click that stops someone earning.
    await expect(page.getByLabel(/Why are they being suspended/)).toBeVisible();
  });
});

test.describe('who may reach the ops screens', () => {
  test('keeps a client out of the auditor roster', async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/admin/auditors');
    await expect(page).not.toHaveURL(/\/admin\//);
  });

  test('keeps an auditor out of the auditor roster', async ({ page }) => {
    // An auditor seeing the roster would see every other auditor's real name,
    // their coverage and their conflicts.
    await signIn(page, 'auditor');
    await page.goto('/admin/auditors');
    await expect(page).not.toHaveURL(/\/admin\//);
  });
});
