import { expect, test } from '@playwright/test';
import { signIn } from './support';

/**
 * Signing out.
 *
 * Shared machines are normal in a charity office: a fundraising manager and a
 * volunteer using the same desktop is the ordinary case, not the edge one. A
 * portal you cannot leave is a portal that leaks a session to whoever sits
 * down next.
 */
test.describe('signing out', () => {
  test('is offered on every page of the client portal', async ({ page }) => {
    await signIn(page, 'client');

    for (const route of ['/book', '/audits', '/credits', '/complaint']) {
      await page.goto(route);
      await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    }
  });

  test('ends the session, and the back button does not resurrect it', async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/audits');

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/sign-in/);

    // The cookie is gone, so returning to a signed-in page bounces.
    await page.goto('/audits');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('is a POST, so another site cannot trigger it with an image tag', async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/audits');

    const control = page.getByRole('button', { name: 'Sign out' });
    await expect(control).toHaveJSProperty('type', 'submit');
    await expect(control.locator('xpath=ancestor::form')).toHaveAttribute('method', /post/i);
  });

  test('is offered in the admin shell too', async ({ page }) => {
    await signIn(page, 'admin');
    await page.goto('/admin');

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
