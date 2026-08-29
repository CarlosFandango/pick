/**
 * Snapshot every page in `pages.mjs`.
 *
 *   node scripts/snapshot/capture.mjs <out-dir> [label]
 *
 * Expects the portal on :3000 and Expo web on :8081, and a database that has
 * been through `pnpm db:reset` — the seed is what makes these pages worth
 * looking at, and a capture against an empty database is a set of empty states.
 *
 * Playwright rather than the Puppeteer MCP server: this needs to sign in as
 * three different roles and hold each session across a dozen navigations, and
 * the repo already depends on Playwright for the e2e suite. One browser
 * driver, not two.
 *
 * JPEG at quality 90 — these go into a design tool, and a 40-page run of
 * full-page PNGs is a large amount of nothing.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ACCOUNTS, FIELD_PAGES, PORTAL_PAGES } from './pages.mjs';

const require = createRequire(`${process.cwd()}/`);
const { chromium } = require('@playwright/test');

const OUT = process.argv[2] ?? 'snapshots';
const LABEL = process.argv[3] ?? 'run';
const PORTAL = 'http://localhost:3000';
const FIELD = 'http://localhost:8081';

mkdirSync(OUT, { recursive: true });

const results = [];
const browser = await chromium.launch();

/** Signed-in page for one role, reused across that role's captures. */
async function portalAs(email) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (e) => results.push({ name: 'pageerror', error: e.message }));
  if (!email) return page;

  await page.goto(`${PORTAL}/sign-in`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', ACCOUNTS.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith('/sign-in'), { timeout: 20000 });
  return page;
}

async function shoot(page, entry, base) {
  const target = `${base}${entry.route}`;
  const response = await page.goto(target, { waitUntil: 'networkidle' }).catch(() => null);
  await page.waitForTimeout(entry.settle ?? 800);

  // The Next.js dev badge sits over the bottom-left of every portal page and
  // is not part of the design. Hidden here rather than switched off in the app
  // config, where it is genuinely useful to whoever is developing.
  await page
    .addStyleTag({
      content: 'nextjs-portal,[data-nextjs-dev-tools-button]{display:none!important}',
    })
    .catch(() => undefined);

  const landed = new URL(page.url()).pathname.replace(/\?.*$/, '');
  const file = `${OUT}/${entry.name}.jpg`;
  await page.screenshot({ path: file, fullPage: true, type: 'jpeg', quality: 90 });

  const text =
    (await page
      .locator('body')
      .innerText()
      .catch(() => '')) ?? '';
  const row = {
    id: entry.id,
    name: entry.name,
    route: entry.route,
    as: entry.as ?? 'auditor',
    status: response?.status() ?? 0,
    bounced: landed === entry.route.replace(/\?.*$/, '') ? null : landed,
    characters: text.replace(/\s+/g, ' ').trim().length,
    responsibility: entry.responsibility,
    state: entry.state,
  };
  results.push(row);
  const flag = row.bounced ? ` BOUNCED->${row.bounced}` : row.characters < 150 ? ' THIN' : '';
  console.log(
    `  ${String(row.status).padEnd(3)} ${entry.name.padEnd(22)} ${String(row.characters).padStart(5)} chars${flag}`,
  );
  return row;
}

console.log(`\nportal (${LABEL})`);
for (const role of ['admin', 'client', 'auditor', null]) {
  const entries = PORTAL_PAGES.filter((p) => (p.as ?? null) === role);
  if (entries.length === 0) continue;
  const page = await portalAs(role ? ACCOUNTS[role] : null);
  for (const entry of entries) await shoot(page, entry, PORTAL);
  await page.close();
}

console.log(`\nfield (${LABEL})`);
{
  // One phone-sized page, signed in once: the app keeps its session in local
  // storage, so a second context would have to sign in again.
  const page = await browser.newPage({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
  });
  page.on('pageerror', (e) => results.push({ name: 'pageerror', error: e.message }));
  await page.goto(FIELD, { waitUntil: 'networkidle', timeout: 180000 });
  await page.waitForTimeout(8000);

  const email = page.locator('input[inputmode="email"], input[type="email"]').first();
  if (await email.count()) {
    await email.fill(ACCOUNTS.auditor);
    await page.locator('input[type="password"]').first().fill(ACCOUNTS.password);
    await page
      .getByText(/sign in/i)
      .last()
      .click();
    await page.waitForTimeout(9000);
  }

  for (const entry of FIELD_PAGES) await shoot(page, { ...entry, settle: 3000 }, FIELD);
  await page.close();
}

await browser.close();

writeFileSync(`${OUT}/index.json`, `${JSON.stringify({ label: LABEL, results }, null, 2)}\n`);

const bad = results.filter((r) => r.bounced || r.error || (r.status && r.status >= 400));
console.log(`\n${results.filter((r) => r.name !== 'pageerror').length} captured into ${OUT}`);
console.log(
  bad.length
    ? `problems:\n${bad.map((b) => `  ${b.name}: ${b.bounced ?? b.error ?? b.status}`).join('\n')}`
    : 'problems: none',
);
