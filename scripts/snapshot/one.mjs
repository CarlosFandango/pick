/** One page, signed in as a role. node shot.mjs <route> <role> <out.jpg> */
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/`);
const { chromium } = require('@playwright/test');
const [route, role = 'client', out = '/tmp/shot.jpg'] = process.argv.slice(2);
const EMAIL = {
  client: 'client@example.test',
  admin: 'admin@example.test',
  auditor: 'auditor@example.test',
}[role];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
if (EMAIL) {
  await p.goto('http://localhost:3000/sign-in');
  await p.fill('input[name="email"]', EMAIL);
  await p.fill('input[name="password"]', 'picksel-dev');
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !u.pathname.startsWith('/sign-in'), { timeout: 20000 });
}
await p.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
await p
  .addStyleTag({ content: 'nextjs-portal,[data-nextjs-dev-tools-button]{display:none!important}' })
  .catch(() => {});
await p.screenshot({ path: out, fullPage: true, type: 'jpeg', quality: 88 });
console.log(
  'landed:',
  new URL(p.url()).pathname,
  errs.length ? `ERRORS: ${errs.join(' | ')}` : 'clean',
);
await b.close();
