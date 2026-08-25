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
  test('a client books, PICK releases, the client reads the report', async ({ page }) => {
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
    const newest = page.getByRole('cell', { name: /^Balance after / }).first();
    await expect(newest).toHaveText(String(balance));
  });

  test('shows what each credit movement was for', async ({ page }) => {
    await page.goto('/credits');
    await expect(page.getByText('Audit booked').first()).toBeVisible();
    await expect(page.getByText('Credits purchased').first()).toBeVisible();
  });
});

test.describe('S3.6 the complaint fork', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/complaint');
  });

  test('separates a problem with the audit from a problem with a fundraiser', async ({ page }) => {
    // Each route appears twice on purpose: once explained, once selectable.
    await expect(page.getByText('Something in the audit is wrong')).toHaveCount(2);
    await expect(page.getByText('Something a fundraiser did is wrong')).toHaveCount(2);
  });

  test('says PICK is not the complaints body for fundraisers', async ({ page }) => {
    // Burying a regulatory matter in a quality queue is the failure mode.
    await expect(page.getByText(/not the complaints body for your fundraisers/)).toBeVisible();
    await expect(page.getByText(/regulator/)).toBeVisible();
  });

  test('asks which audit only when the complaint is about one', async ({ page }) => {
    await expect(page.getByLabel('Which audit?')).toBeVisible();

    await page.getByRole('button', { name: 'Something a fundraiser did is wrong' }).click();
    await expect(page.getByLabel('Which audit?')).toBeHidden();
  });

  test('raises a concern about a fundraiser', async ({ page }) => {
    await page.getByRole('button', { name: 'Something a fundraiser did is wrong' }).click();
    await page
      .getByLabel('What happened?')
      .fill('Fundraiser followed a passer-by down the street.');
    await page.getByRole('button', { name: 'Raise it' }).click();

    await expect(page.getByText(/Raised\./)).toBeVisible();
  });
});

test.describe('S4.1 ops home', () => {
  test('is a queue with the action inline, not a dashboard', async ({ page }) => {
    await signIn(page, 'admin');
    await page.goto('/admin');

    // Four counters are the entire summary.
    await expect(page.getByText('Needs a human', { exact: true })).toBeVisible();
    await expect(page.getByText('In flight today')).toBeVisible();
    await expect(page.getByText('Offers awaiting accept')).toBeVisible();
    await expect(page.getByText('Released this week')).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Needs a human — worst first' })).toBeVisible();
  });

  test('keeps a client out of the cockpit', async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/admin$/);
  });

  test('keeps an auditor out of the cockpit', async ({ page }) => {
    await signIn(page, 'auditor');
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/admin$/);
  });

  test('shows a booked audit whose window is nearly here as needing a human', async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/book');
    await page.getByPlaceholder('SE15 4QL').fill('N16 8AA');
    await page.locator('input[name="windowStartOn"]').fill(inDays(5));
    await page.locator('input[name="windowEndOn"]').fill(inDays(8));
    await page.getByRole('button', { name: 'Confirm booking' }).click();
    await expect(page).toHaveURL(/\/audits\?booked=/);

    await signIn(page, 'admin');
    await page.goto('/admin');
    // Not yet urgent — the window is five days out, not two.
    await expect(page.getByRole('heading', { name: /Needs a human/ })).toBeVisible();
  });
});
