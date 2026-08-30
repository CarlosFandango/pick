import { expect, test } from '@playwright/test';
import { creditBalance, fillLocation, inDays, signIn } from './support';

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

    await fillLocation(page, 'SE15 4QL');
    await page.locator('input[name="windowStartOn"]').fill(inDays(7));
    await page.locator('input[name="windowEndOn"]').fill(inDays(10));
    await page.getByRole('button', { name: 'Confirm booking' }).click();

    await expect(page).toHaveURL(/\/audits\?booked=PS-\d+/);
    const reference = new URL(page.url()).searchParams.get('booked');
    expect(reference).toMatch(/^PS-\d+$/);
    expect(await creditBalance(page)).toBe(before - 1);

    // 2. The confirmation names it and links to it. It appears once: the list
    //    below groups by what each group means to a charity and deliberately
    //    prints no references — a director looking for "PS-000911" is looking
    //    for something only we call it.
    await expect(page.getByRole('link', { name: reference as string })).toBeVisible();
  });

  test('a booked audit is unassigned — the client never picks an auditor', async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/audits');

    // Nothing on the client's list NAMES an auditor or offers a choice of one.
    //
    // This used to assert the word "auditor" appeared nowhere, which held only
    // while the list was a bare table. It now says "we are matching this to an
    // auditor who covers the area" — which is the rule being explained, not
    // broken. What must never appear is an identity or a control.
    await expect(page.getByText(/Auditor \d/)).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: /auditor/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /choose|pick|assign/i })).toHaveCount(0);
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
    await fillLocation(page, 'SE15 4QL');
    await page.locator('input[name="windowStartOn"]').fill(inDays(7));
    await page.locator('input[name="windowEndOn"]').fill(inDays(9));
    await page.getByRole('button', { name: 'Confirm booking' }).click();
    await expect(page).toHaveURL(/\/audits\?booked=PS-\d+/);

    const reference = new URL(page.url()).searchParams.get('booked') as string;
    await page.getByRole('link', { name: reference }).click();

    // Where it has got to, said as a sentence rather than shown as a rail of
    // enum values. The question a charity arrives with is "is anything
    // expected of me", and the answer is almost always no.
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /matching this to an auditor|auditor is assigned/i,
    );
    await expect(page.getByText('Nothing is needed from you.')).toBeVisible();

    // And the history, oldest first, starting with the booking.
    await expect(page.getByText('How this audit has gone')).toBeVisible();
    await expect(page.getByText('You booked it')).toBeVisible();
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
    await expect(page.getByText('Credits purchased').first()).toBeVisible();
    // Booking sets a credit aside; it is only spent once the audit arrives.
    // The two are different facts and the ledger says which is which.
    await expect(page.getByText('Set aside for an audit').first()).toBeVisible();
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

    // The queue IS the page. This used to assert four counters at the top and
    // the queue under them; the counters are now below it and the "needs a
    // human" tile is gone, because the heading says it in words. Two people
    // running a marketplace need to know whether today is normal before they
    // need to know that six audits are in flight.
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /need a person|needs a person|nothing needs a person/i,
    );
    await expect(page.getByText('Worst first · clear this list and the day is done')).toBeVisible();

    // Still subordinate, still present.
    await expect(page.getByText('The network, right now')).toBeVisible();
    await expect(page.getByText('Audits in flight')).toBeVisible();
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
    await fillLocation(page, 'N16 8AA');
    await page.locator('input[name="windowStartOn"]').fill(inDays(5));
    await page.locator('input[name="windowEndOn"]').fill(inDays(8));
    await page.getByRole('button', { name: 'Confirm booking' }).click();
    await expect(page).toHaveURL(/\/audits\?booked=/);

    await signIn(page, 'admin');
    await page.goto('/admin');
    // Not yet urgent — the window is five days out, not two — so it is in the
    // queue without being overdue. The count is in the heading now, in words.
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /need a person|needs a person/i,
    );
    // Deliberately not asserting that nothing on the page is overdue: the seed
    // has a genuinely late write-up, and that is the queue working. What this
    // test is about is that a booked audit five days out reaches the queue at
    // all, without being dressed as urgent.
  });
});

test.describe('S4.2 assignment console', () => {
  test('shows its work — who is eligible and who was set aside', async ({ page }) => {
    // Book something so there is an audit to assign.
    await signIn(page, 'client');
    await page.goto('/book');
    await fillLocation(page, 'SW1A 1AA');
    await page.locator('input[name="windowStartOn"]').fill(inDays(7));
    await page.locator('input[name="windowEndOn"]').fill(inDays(10));
    await page.getByRole('button', { name: 'Confirm booking' }).click();
    await expect(page).toHaveURL(/\/audits\?booked=/);

    const auditHref = await page
      .getByRole('link')
      .filter({ hasText: /PS-\d+/ })
      .first()
      .getAttribute('href');
    const auditId = auditHref?.split('/').pop();

    await signIn(page, 'admin');
    await page.goto(`/admin/assignment/${auditId}`);

    await expect(page.getByText('Everyone considered, and why')).toBeVisible();
    // One column per eligibility test, so the first failing one is visible
    // across the whole pool rather than buried in a sentence per auditor.
    for (const test of ['Approved', 'Reachable', 'Capable', 'Available']) {
      await expect(page.getByRole('columnheader', { name: test })).toBeVisible();
    }
    await expect(page.getByText(/eligible of \d+ active/)).toBeVisible();
    // An operator asking why an audit is stuck gets an answer, not a shorter
    // list. Every considered auditor is a row, and a row that fails a test
    // says which one — "Out of reach", not a missing name.
    await expect(page.getByRole('row')).not.toHaveCount(1);
    await expect(
      page.getByText(/Out of reach|Not vetted|Not signed off|Committed|Seen recently|Conflicted/),
    ).not.toHaveCount(0);
  });

  test('keeps a client out of the assignment console', async ({ page }) => {
    await signIn(page, 'client');
    await page.goto('/admin/assignment/00000000-0000-7000-8000-000000000001');
    await expect(page).not.toHaveURL(/\/admin\//);
  });
});
