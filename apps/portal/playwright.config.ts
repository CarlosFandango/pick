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
/** Deliberately not 3000: `pnpm dev` lives there and the two must not collide. */
const PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false, // shared database; bookings spend real seeded credits
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `next dev --port ${PORT}`,
        url: `http://127.0.0.1:${PORT}/sign-in`,
        // Never reuse. A `pnpm dev` left running goes stale — it keeps serving
        // routes from before a migration or a rename and answers 404, which
        // fails Playwright's readiness check. The run then dies after two
        // minutes on "Timed out waiting from config.webServer", which reads as
        // a broken app rather than a stale process. Its own port and its own
        // server costs one cold start and removes the whole class.
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
