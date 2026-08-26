# Patterns and decisions

**One way to do each thing.** A codebase with four ways to fetch data costs more
than one with a slightly imperfect single way. Before introducing a second
pattern for something already listed here, write down why the existing one
cannot work — in this file, in the same commit. "It felt cleaner" is not a why.

Reading this file should let you predict what unfamiliar code in this repo looks
like before you open it.

## The canonical way to…

| Do this | Use | Not this |
|---|---|---|
| Read data in the portal | `supabaseServer()` in a Server Component; RLS scopes it | client-side fetch, an API route, a repository class |
| Read data in the field app | a function in `field/src/lib/queries.ts` + `useLoad` | fetching inside a screen, a caching library |
| Turn a row into props | an adapter in `field/src/lib/adapters.ts` | shaping inside the screen or the query |
| Show a row RLS hides for good reason | a `security definer` RPC returning only what the screen may reveal | loosening the policy, a service-role key on a device |
| Open a client screen | `clientPage()` — session, client, chrome data | repeating the organisation and balance queries |
| Write across tenants | a server action with `createAdminClient()` | loosening an RLS policy |
| Expose a server action | its own `'use server'` module, one export | adding `'use server'` to a shared lib |
| Offer a state-changing control | a `<form>` POST to a server action | a link, a GET route |
| Generate an id for a field event | `newId()` on the device | server default, autoincrement, composite key |
| Generate an id anywhere else | `default public.uuid_generate_v7()` | `newId()` round-tripped from the client |
| Correct a field event | insert a new row; read with `latestResults()` | UPDATE (it is blocked, deliberately) |
| Sync from device | device-minted id + `on conflict do nothing` | merge, last-writer-wins, server dedup |
| Queue unsent work | `synced_at is null` on the row itself | a separate outbox table |
| Validate input | a zod schema in `core/entities.ts`, parsed at the boundary | ad-hoc `if` checks, validating twice |
| Add a closed set of values | `as const` array in `core` + a PG enum, kept in step | a lookup table, a config file, a string |
| Add a sequence someone else owns | a seeded table (`audit_stage_template`) | an `as const` — their edit becomes a code change |
| Record a field event of a new shape | an `observation_log` row with a `kind` | a new table per event type |
| Add a check to the catalogue | new `check_definition` row, new `version` | editing an existing row |
| Represent money | integer minor units, never a float | decimal string, `Money` class |
| Format money | `formatMoney(minorUnits, currency)` | a `£` in a component, a hardcoded `/100` |
| Quote a price | read `credit_bundle`; amount and currency together | a price constant in app code |
| Derive a value from a column | a stored generated column | parsing in application code |
| Enforce an invariant | a CHECK or unique partial index | a service-layer guard alone |
| Test a policy | impersonate `authenticated` in `packages/db/test` | checking as postgres, service_role or anon |
| Handle a failure | let it throw at the boundary and surface it | retry loops, backoff, circuit breakers |
| Test domain logic | Vitest in `packages/core/test`, no I/O | a test that needs a database or device |
| Test app logic that touches a platform | depend on a narrow interface, pass a double | mocking `expo-sqlite`, booting a simulator |
| Keep logic testable | pure module beside the platform binding | logic inside the file that imports the SDK |
| Change the schema | a new migration, then `pnpm db:types` | editing a pushed migration, `db execute`, an unexported Studio change |
| Write DDL | explicit statements, one object each | a `DO` block building SQL with `format()`/`execute` |
| Repeat DDL across tables | write it out per table | loop over a table-name array |
| Share code between apps | `packages/core` | `packages/ui` (web only — RN cannot render it) |
| Colour, spacing, type size | a role or scale from `@picksel/tokens` | a hex literal, a magic number |
| Set text size or weight | `webTextStyle(role)` / `text(role)` | `fontSize:` in a component |
| Set a font family | `fontStack`, via the text role | naming a font in a component |
| Add a brand | a new object satisfying `Theme` | overriding CSS, forking components |
| Style a portal component | `color.*`/`radius.*` inline + the helpers in `portal/src/lib/theme.ts` | a CSS file with its own palette, `packages/ui` |
| Style a field component | the same token objects as RN styles | a parallel RN colour constant |
| Convey pass/fail | colour **and** an icon or label | colour alone |
| Size a field tap target | `touchTarget.comfortable` | an arbitrary height |

## Naming

- Database: `snake_case`, **singular** table names (`audit`, not `audits`).
- TypeScript: `camelCase` values, `PascalCase` types, files named after their export.
- Timestamps: `*_at`. Dates without time: `*_on`. Money: `*_minor_units`. Flags: `is_*`.
- Migrations: `YYYYMMDDHHMMSS_subject.sql`, one concern per file.

## Layering

```
core    pure domain — no I/O, no React, no platform APIs.  Both apps depend on it.
tokens  design system. Zero dependencies, nothing platform-specific. Both apps.
api     the only place a Supabase client is constructed.
db      schema is the source of truth; types are generated from it, never written.
ui      web components. Portal only.
apps    composition and presentation. Business rules do not live here.
```

If a rule cannot be tested in `core` without a database, it is probably in the
wrong layer.

## Commits

One coherent change per commit, green on its own, revertable in isolation.

- A commit that only makes sense alongside the next one should be squashed into it.
- Never mix a refactor with a behaviour change — a revert then forces a choice
  between losing the fix and keeping the churn.
- Tests land with the code they cover, in the same commit.
- Schema and the regenerated `types.generated.ts` land together; separately, one
  of them is broken.
- Subject line says *what*; the body says *why*. The diff already says how.

## Pitfalls that have already bitten

Recorded because each was expensive to find, and each will happen again unless
something checks for it. Format: symptom, why it hid, what catches it now.

### A privilege that exists but cannot be used
**Symptom:** `permission denied for schema app` on every RLS-protected table,
for every signed-in user — the whole API dead.
**Why it hid:** EXECUTE on a function is inert without USAGE on its schema, and
nothing warns you. Every check I ran used a role that never evaluates a policy:
`postgres` and `service_role` bypass RLS, `anon` matches no policy at all. A
`curl` returning `[]` looked like proof RLS worked; it was proof nothing ran.
**Caught now by:** `pnpm test:rls`, which impersonates `authenticated`.

### A schema that inherits privileges it never declares
**Symptom:** identical migrations, `permission denied for table
check_definition` in CI, green locally.
**Why it hid:** a Supabase stack bootstraps `alter default privileges ... grant
all on tables`, so the schema worked without ever granting anything. A newer CLI
in CI bootstraps differently. Anything you did not declare can change under you.
**Caught now by:** grant assertions in the RLS suite, and CI running the whole
database job on a clean stack with the latest CLI.

*Both are the same lesson: **a permission model must be stated and exercised as
the role that actually uses it.** Two shapes, one week apart.*

### Tests that assert absolute counts against a shared database
**Symptom:** integration tests pass alone and fail after a UX run —
`expected 2 to be 1`, or "the first complaint" turning out to be someone
else's.
**Why it hid:** the RLS suite runs each test in a rolled-back transaction, so
it *looks* isolated. It is not isolated from rows that were already there: the
Playwright suite books real audits, spends real credits and raises real
complaints against the same local database. Anything asserting a total, or
"the first row", is really asserting "nobody has used this app".
**Caught now by:** asserting membership of a record the test created, never a
count or a position. Three tests needed this fix before it was recognised as
one pattern rather than three coincidences.

### UX tests that consume a finite fixture
**Symptom:** the Playwright suite passes, then fails a few runs later on what
looks like a broken booking screen.
**Why it hid:** each booking spends a credit and the seeded charity starts
with four. The failure surfaces far from its cause — an exhausted fixture
looks exactly like a broken form.
**Caught now by:** a global setup that tops the ledger up to a floor before
the run. It appends rather than sets, because the ledger is append-only and
there is no row to overwrite.

### A fill token used where its text pair belongs
**Symptom:** the pipeline rail on `/audits/:id` was unreadable — upcoming steps
at 1.16:1 against the page, the current step's marker at 1.75:1. Not "slightly
low": invisible on a dim monitor.
**Why it hid:** every colour came from `design/tokens/tokens.ts`, so it looked
correct by the rule that matters most here ("no colour that is not a token").
But the brand ships accents in pairs — `auditing` is signage, `auditingText` is
the same accent as type — and a token name does not say which it is. Contrast
also degrades quietly: nothing errors, nothing logs, and it reads fine on the
laptop it was built on.
**Caught now by:** `packages/tokens/test/brand.test.ts`, which classifies every
brand colour as text / surface / hairline / fill and fails if a new token
arrives unclassified. Fills are asserted to *fail* as text, so the pairing is a
test rather than a paragraph in the build guide.

### A stale dev server that reads as a broken app
**Symptom:** the Playwright suite dies after two minutes on `Timed out waiting
120000ms from config.webServer`, having run nothing. Twice.
**Why it hid:** the config reused an existing server on port 3000, and a
long-running `pnpm dev` goes stale — after a `db:reset` or a rename it keeps
serving routes it compiled earlier and answers 404 on `/sign-in`. Playwright's
readiness check then never passes, but the error names the *web server config*,
not the stale process, so the obvious reading is that the app is broken. Both
times the fix was `kill` on a PID, after minutes of looking at the wrong thing.
**Caught now by:** the suite runs its own server on its own port (3100) and
never reuses one. One cold start per run, and the collision cannot happen.

### Green typecheck, broken build
**Symptom:** `tsc` clean; `next build` fails on `Can't resolve './primitives.js'`,
then on `Cannot read properties of null (reading 'useRef')`.
**Why it hid:** `tsc` resolves `./x.js` to `x.ts` and bundlers do not; and two
copies of React in one tree only misbehave at prerender. Neither is visible to
lint, typecheck or unit tests.
**Caught now by:** `pnpm build` in CI.

## Decision log

### 2026-08-26 — Portal primitives live in `lib/theme.ts`, not `packages/ui`

`packages/ui` holds a Button and a Card, is imported by zero screens, and
styles them with `var(--colour-*)` custom properties and the `space`/`fontSize`
scales. Every real portal screen uses `color.*`/`radius.*` from
`@picksel/tokens` plus the helpers in `apps/portal/src/lib/theme.ts`. Those are
two vocabularies for one job, and extracting into `packages/ui` would have made
a third.

So the repeated pieces went where the code already is: `card` (which already
existed and was imported by nothing while 27 sites spelled out its three
properties), plus `pageTitle` and `adminPage`. The PATTERNS row that said to
style portal components with `var(--colour-*)` was describing `packages/ui`
rather than the portal, and has been corrected.

`packages/ui` stays as it is for now: deleting it is a separate change, and it
is not costing anything while nothing imports it.



### 2026-08-26 — Which test layer owns which question

Four layers, and the rule for picking one is *what would have to be true for
this to fail*:

| Layer | Where | Answers | Cost |
|---|---|---|---|
| Domain | `packages/core/test` | a rule, with no I/O | ms |
| Component | `apps/*/test/*.test.tsx` | what a screen shows and offers | ms |
| Integration | `packages/db/test` | a policy, a grant, a constraint | seconds |
| UX | `apps/portal/e2e` | the app works, as a person, signed in | minutes |

The portal had no component layer, so every visual question went to Playwright:
single worker, real database, dev server. A full run is ~2.7 minutes and one
spec is ~20 seconds, which made design iteration cost about twenty seconds a
look. Fourteen component tests covering the same ground run in 1.5.

What makes it possible: **pages fetch, components render.** A page is an async
Server Component doing queries and passing props; the JSX worth asserting on
lives in sync components under it. Nothing in the component layer renders a
page — a page is only true against a real session and real RLS, which is
exactly what Playwright is for.

Same tooling and setup file as `apps/field`, deliberately. Rejected: Storybook,
which is a permanent maintenance surface for feedback the component tests and
the running app already give a solo developer.

### 2026-08-26 — Currency is data, never baked into the logic

Money stays an integer count of a currency's smallest unit. What changed is
that nothing in `core` may know *which* currency that is: `formatMoney` takes
one, derives the divisor from it (yen has no minor unit, so a hardcoded `/100`
renders ¥500 as ¥5), and a price is an amount **and** a currency travelling
together. No component prints a `£`.

The market is UK today, but `organisation.residency_zone` already models `eea`
and `other`. A currency assumed in a helper name, a symbol or a divisor is the
kind of rewrite that surfaces as wrong numbers on an invoice rather than as a
failing build.

The schema followed the same day (`20260826230000_currency_generic_money.sql`):
every `_pence` column is now `_minor_units`, and the two fee functions with
`pence` in their names were renamed too. `alter … rename` throughout rather
than add/backfill/drop, so grants, defaults, check constraints and view
references followed the objects and no row was rewritten. Function bodies are
text to Postgres, so the three whose plpgsql named a renamed column had to be
restated — that is the part a rename does *not* do for you.

**Deliberately not done: a currency column.** There is one currency, and a
column repeating `'GBP'` on every row is a constant with storage, not a record
of a decision. The decision worth capturing is "what is this charity billed
in", and it belongs on `organisation` — next to `residency_zone` — when a
second currency is actually in prospect. The two permanent ledgers
(`credit_transaction`, `audit_pay_item`) will want their own copy at that point
rather than inheriting, because evidence must not change meaning when a
setting does.


Newest first. Record the alternative that was rejected — that is the part that
stops the decision being relitigated.

### 2026-08-25 — One React version, pinned to React Native's requirement
`pnpm.overrides` pins react/react-dom to 19.1.0 workspace-wide. Expo 54 needs
exactly that; the portal was resolving 19.2.8, and two Reacts in one tree made
hooks read null internals at prerender. *Rejected:* letting each app resolve its
own — it typechecked perfectly and failed only at build.

### 2026-08-25 — Extensionless relative imports in workspace packages
`tsc` resolves `./primitives.js` to `primitives.ts`; webpack does not. These
packages ship TypeScript source to bundlers (Next, Metro, Vitest), so
extensionless is the correct form under `moduleResolution: bundler`.
*Rejected:* webpack `extensionAlias` config — one more thing to configure in
each app, to keep an extension none of the consumers want.

### 2026-08-25 — Explicit DDL over dynamic SQL in migrations
`20260825090600_append_only.sql` originally looped over a table-name array in a
`DO` block, calling `format()` and `execute` to build the REVOKEs and triggers.
Rewritten as nine plain statements. *Rejected:* the loop — it was shorter, but
you could not grep for `check_result_append_only`, `db diff` could not reason
about it, and a failure pointed at a generated string instead of a line. Three
repeated `create trigger` statements are cheaper to live with than one clever one.

### 2026-08-26 — RLS tested by impersonating the role, in a rolled-back transaction
`set local role authenticated` plus the `request.jwt.claims` GUC that
`auth.uid()` reads, inside a transaction that always rolls back. Exercises the
real policy expressions with no HTTP, no JWT signing and no shared state.

Written after a missing `grant usage on schema app` left every policy raising
"permission denied for schema app" for every signed-in user — invisible because
postgres and service_role bypass RLS and anon matches no policy, so all three
skip the expression entirely. *Rejected:* pgTAP (a second test vocabulary to
maintain) and signing JWTs against PostgREST (slower, and it tests HTTP rather
than the policies).

**Only test policies as `authenticated`.** A check that passes as any other role
proves nothing.

### 2026-08-25 — Narrow interfaces over module mocks in the field app
`LocalDatabase` declares the five expo-sqlite calls the app makes;
`SQLiteDatabase` satisfies it structurally, so nothing changed at the call site
and the sync and migration logic became testable with an in-memory double.
Migration stepping moved to its own module because importing `client.ts` drags
in expo-sqlite and the whole React Native runtime, which Vitest cannot parse.
*Rejected:* mocking `expo-sqlite` — it would test the mock, and the Flow-syntax
parse failure would still be there.

### 2026-08-25 — System font stack, split per platform
`fontStack` gives each family a `web` CSS list plus single `ios`/`android` names,
because React Native silently falls back to the default face if handed a
comma-separated stack. Text is set through semantic roles (`title`, `body`,
`code`), so neither app names a size. *Rejected:* bundling Inter — identical
rendering everywhere, at the cost of font files in the binary, `expo-font`
loading, a flash of unstyled text on the web and a licence to track. Revisit when
brand needs a specific face.

### 2026-08-25 — Shared design tokens, platform-specific components
`packages/tokens` holds colour roles, spacing, type scale and touch targets with
zero dependencies; the portal renders them as CSS variables and the field app as
React Native styles. Rebranding becomes one object. *Rejected:* a cross-platform
component library (react-native-web or similar) — one `<Button>` for both would
need an abstraction over two genuinely different rendering models, and every
component would pay for it forever to save duplicating a handful of small views.

### 2026-08-25 — success/danger separated in luminance, not just hue
Verified by test: red-green is the common colour-blindness pair and this is a
pass/fail product, so the two must differ in greyscale. Palette values were
chosen by searching for pairs that also keep AA text contrast on the fill.
*Rejected:* the original palette — it looked right and had a 1.04 contrast ratio
between pass and fail, i.e. indistinguishable without colour.

### 2026-08-25 — Biome instead of ESLint + Prettier
One binary, one config, no plugin version churn. At 10–15 hrs/week, toolchain
maintenance is a real cost. *Rejected:* ESLint + Prettier + typescript-eslint +
eslint-config-next — better Next-specific rules, four more moving parts.

### 2026-08-25 — Field event ids minted on the device
Makes sync idempotent with no server-side dedup: a resent batch is a no-op.
*Rejected:* server-generated ids with a client correlation key — needs a mapping
table and a merge path, both of which can be wrong.

### 2026-08-25 — UUIDv7 on the client, not the SQL function, where order matters
The client generator is monotonic within a millisecond; `uuid_generate_v7()` is
not (verified: 50/50 out of order). Latest-wins tie-breaks on id, so ordering has
to be real. *Rejected:* trusting the SQL function equally — it would have been a
silent, rare mis-ordering.

### 2026-08-25 — Append-only enforced twice
`REVOKE` for `anon`/`authenticated`, plus a statement-level trigger that also
catches `service_role`. *Rejected:* RLS alone — it does not constrain
`service_role`, which is exactly what a bad migration script runs as.

### 2026-08-25 — Admin-only writes on `organisation` and `user_profile`
Profile edits go through server actions where the rule is testable.
*Rejected:* self-update policies plus a trigger guarding `role`/`organisation_id`
— more moving parts than screens that need it today.

### 2026-08-25 — `synced_at` on the row instead of an outbox table
One table, one truth, nothing to reconcile if the two disagree.
*Rejected:* a dedicated outbox — standard, but it introduces a second copy of
every pending row and a failure mode where they diverge.

### 2026-08-25 — Postcode matching on area letters only
Coarse on purpose. Proves the matching model before investing in geography.
*Rejected:* PostGIS with travel-time radius — real infrastructure for a
hypothesis we have not tested.

### 2026-08-25 — `compliance_category` withheld from the device
Not merely hidden in the UI: absent from the field app's SQLite schema entirely,
and check prompts are worded not to telegraph it. An auditor who knows a question
is "the vulnerability one" answers it differently. *Rejected:* sending it and
hiding it in the UI — one careless render and the audit stops measuring what it
claims to.

### 2026-08-25 — Local analytics (vector/logflare) disabled
`vector` needs the Docker socket at a path colima does not expose, and nothing in
PICKsel reads those logs. *Rejected:* switching colima to vz/virtiofs — a change
to the whole machine's container runtime to fix one unused container.
