import { defineConfig, devices } from '@playwright/test';

/**
 * UX tests: the portal driven as a person drives it, against a real database.
 *
 * These are the only tests that prove a screen works. Unit tests prove a rule,
 * integration tests prove a policy — neither notices a form that never
 * submits, a button that is disabled forever, or a redirect that loops.
 *
 * They need the local Supabase stack (`pnpm db:start`); the seeded accounts in
 * packages/db/supabase/seed.sql are what they sign in as.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false, // shared database; bookings spend real seeded credits
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://127.0.0.1:3000/sign-in',
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
