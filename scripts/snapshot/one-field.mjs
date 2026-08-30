/** Field app at phone width. node fshot.mjs <route> <out.jpg> */
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/`);
const { chromium } = require('@playwright/test');
const [route = '/', out = '/tmp/f.jpg'] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:8081/sign-in', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
const email = p.locator('input').first();
if (await email.count()) {
  await email.fill('auditor@example.test');
  await p.locator('input').nth(1).fill('picksel-dev');
  await p
    .locator('text=Sign in')
    .last()
    .click()
    .catch(() => {});
  await p.waitForTimeout(4000);
}
if (route !== '/') {
  await p.goto(`http://localhost:8081${route}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
}
await p.screenshot({ path: out, fullPage: true, type: 'jpeg', quality: 88 });
console.log(
  'landed:',
  new URL(p.url()).pathname,
  errs.length ? `ERRORS: ${errs.slice(0, 2).join(' | ')}` : 'clean',
);
await b.close();
