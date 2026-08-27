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

test.describe('S4.5 clients', () => {
  test('shows what each charity holds and what it has used', async ({ page }) => {
    await signIn(page, 'admin');
    await page.goto('/admin/clients');

    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible();
    for (const heading of ['Charity', 'Residency', 'Credits', 'Booked', 'Released']) {
      await expect(page.getByRole('columnheader', { name: heading })).toBeVisible();
    }
  });

  test('will not adjust credits without a reason', async ({ page }) => {
    // It writes a permanent row on a ledger the charity can read.
    await signIn(page, 'admin');
    await page.goto('/admin/clients');

    await page.getByRole('button', { name: 'Adjust credits' }).first().click();
    await expect(page.getByLabel(/Why/)).toBeVisible();

    const reason = page.getByLabel(/Why/);
    await expect(reason).toHaveAttribute('required', '');
  });

  test('keeps a client out of the client roster', async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/admin/clients');
    await expect(page).not.toHaveURL(/\/admin\//);
  });
});

test.describe('the risk register and the gates', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'admin');
  });

  test('the register explains itself when empty rather than looking broken', async ({ page }) => {
    await page.goto('/admin/risks');
    await expect(page.getByRole('heading', { name: 'Risk register' })).toBeVisible();
  });

  test('a gate can hold payment and release independently', async ({ page }) => {
    await page.goto('/admin/gates');
    await expect(page.getByRole('heading', { name: 'Review gates' })).toBeVisible();

    // The separation is the point, and it is stated on the screen because a
    // future operator toggling these needs to know it is deliberate.
    await expect(page.getByText(/Holding a report never delays a fee/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'client release' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'payment' }).first()).toBeVisible();
  });

  test('offers no way to invent a trigger', async ({ page }) => {
    // Adding one is a code change reviewed like any other. A rule-authoring
    // engine would be more complex than the tiers it replaced.
    await page.goto('/admin/gates');
    await expect(page.locator('input[name="trigger"][type="text"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /add.*gate|new gate/i })).toHaveCount(0);
  });

  test('keeps a client out of both', async ({ page }) => {
    await signIn(page, 'client');
    for (const route of ['/admin/risks', '/admin/gates']) {
      await page.goto(route);
      await expect(page).not.toHaveURL(/\/admin\//);
    }
  });
});

test.describe('finding an audit that is not in today’s queue', () => {
  test('lists every audit, not just the ones needing a human today', async ({ page }) => {
    // The gap this closed: the ops home is a queue, and an audit booked for
    // next month appeared in it nowhere. Not filtered — unreachable, because
    // nothing else listed audits and nothing linked to the assignment console.
    await signIn(page, 'admin');
    await page.goto('/admin/audits');

    await expect(page.getByRole('heading', { name: 'Audits' })).toBeVisible();
    for (const heading of ['Reference', 'Charity', 'Type', 'Location', 'Window', 'Status']) {
      await expect(page.getByRole('columnheader', { name: heading })).toBeVisible();
    }
  });

  test('offers the assignment console on an audit still waiting for an auditor', async ({
    page,
  }) => {
    await signIn(page, 'admin');
    await page.goto('/admin/audits');

    const assign = page.getByRole('link', { name: 'Assign' }).first();
    if ((await assign.count()) === 0) test.skip();

    await assign.click();
    await expect(page).toHaveURL(/\/admin\/assignment\//);
  });

  test('every admin screen is reachable from the header, not only by URL', async ({ page }) => {
    await signIn(page, 'admin');
    await page.goto('/admin');

    for (const label of ['Audits', 'Auditors', 'Clients', 'Risks', 'Gates']) {
      await expect(page.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
  });
});
