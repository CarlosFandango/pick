import { expect, type Page } from '@playwright/test';

/** Seeded local accounts. See packages/db/supabase/seed.sql. */
export const accounts = {
  client: { email: 'client@example.test', password: 'picksel-dev' },
  auditor: { email: 'auditor@example.test', password: 'picksel-dev' },
  admin: { email: 'admin@example.test', password: 'picksel-dev' },
} as const;

export async function signIn(page: Page, who: keyof typeof accounts) {
  const { email, password } = accounts[who];
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/sign-in/);
}

/** A yyyy-mm-dd date n days from today, so the lead-time rule is respected. */
export function inDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The credit count in the chrome, which the design keeps permanently visible. */
export async function creditBalance(page: Page): Promise<number> {
  const text = await page.getByText(/CREDITS\s+\d+/).innerText();
  return Number(text.replace(/\D+/g, ''));
}
