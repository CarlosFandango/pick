/** Sign in as admin, invite an auditor, open the invitation link, shoot it. */
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/`);
const { chromium } = require('@playwright/test');
const out = process.argv[2] ?? '/tmp/welcome.jpg';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1100 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:3000/sign-in');
await p.fill('input[name="email"]', 'admin@example.test');
await p.fill('input[name="password"]', 'picksel-dev');
await p.click('button[type="submit"]');
await p.waitForURL((u) => !u.pathname.startsWith('/sign-in'), { timeout: 20000 });
await p.goto('http://localhost:3000/admin/auditors', { waitUntil: 'networkidle' });
const email = `overnight-${Date.now()}@example.test`;
await p.fill('input[type="email"]', email);
await p.click('button:has-text("Create invitation")');
await p.waitForTimeout(2500);
const link = await p
  .locator('a[href*="/welcome"], code, input[readonly]')
  .first()
  .innerText()
  .catch(() => null);
console.log('invite result:', (link || '').slice(0, 160));
const body = await p.locator('body').innerText();
const m = body.match(/https?:\/\/[^\s]*(?:welcome|auth\/callback)[^\s]*/);
if (!m) {
  console.log('NO LINK FOUND');
  console.log(body.slice(0, 900));
  await b.close();
  process.exit(0);
}
const p2 = await b.newPage({ viewport: { width: 1440, height: 1100 } });
p2.on('pageerror', (e) => errs.push(e.message));
await p2.goto(m[0], { waitUntil: 'networkidle' });
await p2.waitForTimeout(1000);
// Fill it in the way an auditor would, so the shot shows the screen doing its job.
await p2.fill('input[name="password"]', 'picksel-dev').catch(() => {});
await p2.fill('input[name="full_name"]', 'Overnight Tester').catch(() => {});
await p2
  .selectOption('select[aria-label="You set out from"]', { index: 1 })
  .catch((e) => console.log('select failed', e.message));
await p2.waitForTimeout(2200);
await p2.check('input[value="street"]').catch(() => {});
await p2.waitForTimeout(400);
await p2
  .addStyleTag({ content: 'nextjs-portal,[data-nextjs-dev-tools-button]{display:none!important}' })
  .catch(() => {});
await p2.screenshot({ path: out, fullPage: true, type: 'jpeg', quality: 88 });
console.log(
  'landed:',
  new URL(p2.url()).pathname,
  errs.length ? `ERRORS: ${errs.join(' | ')}` : 'clean',
);
if (process.argv[3] === 'submit') {
  await p2.click('button[type="submit"]');
  await p2.waitForTimeout(3000);
  console.log('after submit:', new URL(p2.url()).pathname);
  const t = await p2.locator('body').innerText();
  console.log(t.slice(0, 320).replace(/\n+/g, ' | '));
}
await b.close();
