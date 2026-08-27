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
| Keep a column off the API | `revoke select on <table>`, then `grant select (cols)` | a column-level REVOKE, which no-ops under a table grant |
| Score a client-facing report | `overallScore()` | `scoreAudit()`, which needs the withheld category |
| Sync from device | device-minted id + `on conflict do nothing` | merge, last-writer-wins, server dedup |
| Queue unsent work | `synced_at is null` on the row itself | a separate outbox table |
| Validate input | a zod schema in `core/entities.ts`, parsed at the boundary | ad-hoc `if` checks, validating twice |
| Add a closed set of values | `as const` array in `core` + a PG enum, kept in step | a lookup table, a config file, a string |
| Keep two copies of one fact honest | a comparison test in `packages/db/test/in-step.test.ts` | remembering, or a code generator |
| Add a sequence someone else owns | a seeded table (`audit_stage_template`) | an `as const` — their edit becomes a code change |
| Record a field event of a new shape | an `observation_log` row with a `kind` | a new table per event type |
| Add a check to the catalogue | new `check_definition` row, new `version` | editing an existing row |
| Represent money | integer minor units, never a float | decimal string, `Money` class |
| Format money | `formatMoney(minorUnits, currency)` | a `£` in a component, a hardcoded `/100` |
| Quote a price | read `credit_bundle`; amount and currency together | a price constant in app code |
| Derive a value from a column | a stored generated column | parsing in application code |
| Enforce an invariant | a CHECK or unique partial index | a service-layer guard alone |
| Test a policy | impersonate `authenticated` in `packages/db/test` | checking as postgres, service_role or anon |
| Prove a role *cannot* do something | a direct table write in `test/refusals.test.ts` | calling the RPC with the wrong role and stopping there |
| Expose a new table or RPC | grant it by name, then add it to `test/surface.test.ts` | letting the platform's default privileges decide |
| Handle a failure | let it throw at the boundary and surface it | retry loops, backoff, circuit breakers |
| Test domain logic | Vitest in `packages/core/test`, no I/O | a test that needs a database or device |
| Test app logic that touches a platform | depend on a narrow interface, pass a double | mocking `expo-sqlite`, booting a simulator |
| Keep logic testable | pure module beside the platform binding | logic inside the file that imports the SDK |
| Change the schema | a new migration, then `pnpm db:types` | editing a pushed migration, `db execute`, an unexported Studio change |
| Write DDL | explicit statements, one object each | a `DO` block building SQL with `format()`/`execute` |
| Repeat DDL across tables | write it out per table | loop over a table-name array |
| Share code between apps | `packages/core` | a shared component package — RN cannot render web components |
| Colour, spacing, type size | a role or scale from `@picksel/tokens` | a hex literal, a magic number |
| Set text size or weight | `webTextStyle(role[, size])` / `text(role[, size])`, size from `fontSize` | a number in a component — `pnpm check:tokens` fails the build |
| Set a font family | `sans` / `mono` from `lib/theme` (portal) or `fontStack` (field) | naming a font in a component, or naming one nothing loads |
| Add a brand | a new object satisfying `Theme` | overriding CSS, forking components |
| Style a portal component | `color.*`/`radius.*` inline + the helpers in `portal/src/lib/theme.ts` | a CSS file with its own palette |
| Link between portal screens | `next/link`, to a route with a `page.tsx` | a bare `<a href>`, or a route nothing serves — `pnpm check:routes` fails the build |
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
**Caught now by:** the privilege inventories in `surface.test.ts` — which sweep
every table and function rather than naming a few — and CI running the whole
database job on a clean stack with the latest CLI.

### A rule in a function, and a door left open beside it
**Symptom:** none. Everything worked. `book_audit` spent a credit, `accept_offer`
withdrew the losing offers, `release_audit` refused anything not in review — and
a client could `insert into audit` for a free audit booked for tomorrow, an
auditor could `update audit set auditor_fee_pence = 999999, status = 'released'`,
and an auditor could `update audit_offer set outcome = 'accepted'` and strand
the audit forever behind the unique index.
**Why it hid:** the rule was real, tested and enforced — inside the function.
`authenticated` also held table-level INSERT/UPDATE/DELETE on everything, and
each policy let the obvious caller through, so beside every checked path was an
unchecked one that did the same write. Every refusal test we had called the
*function* with the wrong role; not one went at the table directly. A hole in
the table path looks exactly like a system that works.
**Caught now by:** `packages/db/test/refusals.test.ts` — what each role must not
be able to do, always as a direct table write, never as an RPC call. Write an
RPC, write the refusal for doing the same thing without it.

### A snapshot grant, undone by a default privilege
**Symptom:** `anon` held SELECT on `complaint`, `prep_progress`,
`auditor_conflict` and `auditor_capability`; `authenticated` could execute every
internal helper including `auditor_code_for`, which exists to make an auditor
unidentifiable.
**Why it hid:** `revoke all on all tables in schema public from anon` reads like
a rule and is a snapshot — it says nothing about the table created two
migrations later, which picks the platform's default privileges straight back
up. Postgres grants EXECUTE on a new function to PUBLIC for the same reason.
The test that should have caught it asserted `anon` had no privilege on
`public.audit` — one table, by name, and the wrong one.
**Caught now by:** `packages/db/test/surface.test.ts`, which sweeps every table
and every function rather than naming one, and `alter default privileges`
statements that cover objects nobody has created yet. A revoke without a
matching default-privileges rule is half a revoke.

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

### Links to pages nobody built
**Symptom:** the Reports tab on every client screen, the redirect after every
successful review action, and four of the six actions on the ops home all led to
a 404. Releasing an audit — the primary path off S1.7 — landed on one.
**Why it hid:** a route is a string. Next resolves it at request time, so lint,
tsc and the unit tests all have nothing to say, and the Playwright suite walks
the booking spine and the role gates rather than the navigation. The ops home's
links live in `core`, one package away from the app that has to serve them.
**Caught now by:** `pnpm check:routes`, which compares every route-shaped
literal in the portal and in `ops.ts` against the `page.tsx` files that exist.
Static, so it runs beside the secret and token tripwires instead of in the job
that needs a database and a browser. Anchor such a check on the string, not on
`href=` — there are five spellings and the first version of this missed two.

### The same idea, twice, with two different numbers
**Symptom:** the S3.2 picker warned a client that an auditor had audited them
"1 times in 60 days"; assignment excluded that auditor for 90. Same charity-facing
idea, a different answer depending which screen asked.
**Why it hid:** `exposure_window_days()` exists precisely so this cannot happen,
and the newer function simply did not call it — 60 was written as a literal in
the query and again inside the warning text. Nothing compares two numbers that
are supposed to be one. The same gap covered the enums and the booking
constants: PATTERNS says an `as const` array in core plus a PG enum "kept in
step", and keeping them in step was a person remembering.
**Caught now by:** `packages/db/test/in-step.test.ts` — every enum core
enumerates at runtime compared to its PG counterpart in order, and the booking
constants exercised through `book_audit` rather than compared as literals. A
test that pins the number itself is part of the problem: the override test used
to assert "60 days" in the warning text, and now reads the constant.

### A column-level REVOKE that does nothing
**Symptom:** `revoke select (compliance_category) on check_definition from
authenticated` ran without error and changed nothing at all.
**Why it hid:** Postgres accepts the statement and silently keeps the
table-level grant, which already covers every column. There is no warning and
`has_column_privilege` still returns true. A migration reads as if the column is
withheld while the column is not withheld.
**Caught now by:** the withheld-column sweep in `surface.test.ts`, which asserts
the *outcome* rather than trusting the statement. The form that works is `revoke
select on <table>`, then `grant select (col, col, …)` by name — after which
`has_table_privilege(..., 'select')` is false and `has_any_column_privilege` is
true, so any test written the obvious way needs the second one.

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

### `create or replace function` with a changed signature makes a second function
**Symptom:** `function book_audit(unknown, unknown, ...) is not unique`, on a
call that had worked for weeks from the portal.
**Why it hid:** adding `p_requires_av` to `book_audit` looked like a rewrite —
same name, `create or replace`, migration applied cleanly. Postgres identifies
a function by name *and* argument types, so it created an overload and left the
old one in place. The portal always passed the new argument, so it always
resolved unambiguously and nothing failed. The stale version sat there for a
fortnight, and any call omitting the last argument would have run the OLD body
— writing the old ledger row and bypassing every rule added since.
**Caught now by:** two things, because remembering is not one. `drop function`
with the explicit old signature in the migration that changes one; and
`surface.test.ts` asserting that no name in `public` has more than one
signature, which fails whether or not anyone thought about it. A deliberate
overload will fail that test too, which is the right moment to ask whether both
signatures should be reachable.

It was also visible the whole time in `types.generated.ts`, where `book_audit`
was a union of two `Args` shapes — and that read as a generator quirk rather
than a fact about the schema.

### A `security definer` function granted to `authenticated` is granted to everybody
**Symptom:** an auditor who gets zero rows for another charity's audit through
RLS could call `matching_review_gates()` on that same audit id and receive
`"First audit for this charity."`, `"Auditor's first 3 audits are reviewed.
This is number 1."` and `"2 open risk(s) recorded against this assignment."`
— another organisation's trading history, another auditor's track record, and
risk data. `audit_gate_state()` and `review_gate_reason()` leaked the same way.

**Why it hid:** three separate things each looked like the check:

- The tables were correctly locked down. `review_gate` is admin-only, and RLS
  covers `audit` and `risk`. But `security definer` runs as the owner, so none
  of that applies *inside* the function.
- The functions carried `revoke all ... from public, anon`, which **reads like
  a permission check and is not one**. It removes the roles nobody was worried
  about and leaves the one that matters.
- `authenticated` is a single role shared by every signed-in user — auditor,
  client, admin alike. Granting EXECUTE to it grants it to everyone with a
  login. There is no "signed in, therefore entitled" in this schema; entitlement
  is `app.is_admin()` or a match on `auth.uid()`.

A fourth thing hid it further: the function's tests called it through
`arrange`, which resets to `postgres`. They passed *because* there was no
guard, and adding one broke seven of them — which is how the guard proved it
worked.

**Caught now by:** `packages/db/test/gate-function-access.test.ts`, which asks
as an auditor and as a client for an audit belonging to someone else. Any new
`security definer` function needs the same pair of tests.

**Sweep for the rest of them:**

```sql
select p.proname,
       case when pg_get_functiondef(p.oid) ilike '%is_admin%'   then 'guarded'
            when pg_get_functiondef(p.oid) ilike '%auth.uid()%' then 'scoped-to-caller'
            else 'NO GUARD' end as guard
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by 2, 1;
```

Every row must read `guarded` or `scoped-to-caller`. When this was first run,
29 of 32 did and these three did not. **A function that takes an id and does
not check the caller against it is the shape to look for** — an id parameter is
an invitation to pass someone else's.


### Green typecheck, broken build
**Symptom:** `tsc` clean; `next build` fails on `Can't resolve './primitives.js'`,
then on `Cannot read properties of null (reading 'useRef')`.
**Why it hid:** `tsc` resolves `./x.js` to `x.ts` and bundlers do not; and two
copies of React in one tree only misbehave at prerender. Neither is visible to
lint, typecheck or unit tests.
**Caught now by:** `pnpm build` in CI.

## Decision log

### 2026-08-27 — Merging the boundary work onto S4.3+
The lockdown was written against an 18-table schema and merged onto a 30-table
one. Two things are worth recording about how that went, because both will
happen again.

Migration order is not a detail. These migrations were numbered `2026082623…`,
which put them *before* the twenty-eight that landed meanwhile — one of them
sharing a timestamp exactly. A revoke that runs before the tables it is meant to
cover exist does nothing for them. Renumbered to run last; nothing had been
pushed to staging, which is the only reason renaming them was allowed.

The inventories earned their keep. `surface.test.ts` named every new table
carrying inherited DML and every new RPC the blanket revoke had cut off — no
reading of twenty-eight commits required, and no chance of missing one. The
grant list also changed shape as a result: rather than re-listing another
developer's thirty-six functions, the migration now revokes only the seven that
held an EXECUTE no `grant` statement anywhere in the directory asks for. Those
seven were enumerated from the database, not guessed.

*Rejected:* rebasing onto main. A merge keeps both histories readable and does
not rewrite commits that were already pushed.

### 2026-08-27 — Behaviour that varies by configuration travels with the row

`capture_mode` was a Postgres enum with two values, and `permissions()` in core
was a `switch` over them deciding whether an auditor could tally, take notes or
drop a marker. Adding a third stage cost a migration, an enum value, a switch
arm and a deploy — for something the business, not the developer, owns.

It is now `audit_capture_mode`: a row per stage carrying `allows_tallies`,
`allows_notes` and `allows_markers`. `permissions()` returns what the row says.
The rule "an interaction stage exposes no tally counter" is a `false` in a
column.

**The flags live on the stage, not on the 36 `audit_stage_template` rows that
reference it.** Copying them per step would be 36 chances to disagree, and the
constraint is a property of the stage.

**Where the tests went.** The unit test that asserted an interaction stage
permits no tally became circular the moment the value came from a fixture —
it proved the fixture agreed with itself. The rule moved to the seed, so its
test moved to `packages/db/test/capture-modes.test.ts`, against the seed. What
stays in `core` is the *enforcement*: `addTally` refusing a stage that does not
permit one. Generally: **when a rule becomes configuration, its test follows it
to the layer that now owns it, and the unit layer keeps only the obedience.**

**Absent flags fail closed** (`allowed()` in `apps/field/src/lib/adapters.ts`).
SQLite has no boolean, so a cached row carries 0/1, and one cached before the
flags existed carries nothing. Capturing too little is visible on the next
shift and gets reported; wrongly permitting a tally during a mystery shop
corrupts the audit with nobody noticing. Fail towards the failure that is loud.

**The reason lives next to the setting.** `audit_capture_mode.caution` holds
the explanation of why the interaction stage is restricted, and the admin
screen shows it beside the toggle. Someone changing this in a year will not
have read the spec, and a bare switch gives them nothing to weigh. A pinned
test asserts the text is present, because an empty column here is a silent
regression.

**Deliberately not done: renaming the concepts.** The business calls
observation and interaction "stages"; the code calls the nine sequence rows
"stages" and these "capture modes". Straightening that out means touching
`observation_log.stage_key`, `audit.stage_set_version`, the whole
`StagedSession` model and the local SQLite schema — a rename sweep riding along
inside a feature commit. It is real confusion and worth fixing on its own.

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

`packages/ui` was then deleted — the separate change this entry left open. See
the entry below.



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

### 2026-08-26 — Every size comes from the six-step scale
Sixteen distinct font sizes were in use across the two apps — 9.5, 10, 10.5, 11,
11.5, 12, 12.5, 13, 13.5, 14, 15, 16, 20, 22, 24, 26, 30, 34, 40, 56 — against a
scale of 12/14/16/20/24/32, and `webTextStyle()` was called exactly once in the
portal, on `<body>`. The stated guarantee that "neither app picks a number, so
neither can drift from the other" was not holding in either app.

All of them are snapped onto the six steps, by an explicit table rather than
nearest-neighbour, because the ties were doing real work: 13 and 15 sit exactly
between two steps, and rounding body copy *down* is the wrong direction.
`fontWeight` gains `extrabold`, which is the drop's own `displayWeight` and the
one weight components were reaching past the scale for, fourteen times.

`webTextStyle(role, size?)` and `text(role, size?)` take a step from the scale,
for a role's family and weight at a different size. That override matters more
in the field app than in the portal: CSS inherits a unitless multiplier so a
changed font-size re-leads itself, while React Native leading is absolute — so
the screens that set `fontSize` on top of a role were rendering small text on
tall lines and nothing said so.

*Rejected:* adding roles at 13 and 10 to fit the sizes already in use. It would
have been a smaller diff and no visual change, at the cost of a scale shaped by
whatever got typed first.

*Cost, accepted and worth a second look:* the field app's two hero numbers — the
no-show wait timer at 56 and pending earnings at 40 — are now 32, the top of the
scale. Those are glanced at outdoors, one-handed, and 32 may be too small. If it
is, the answer is a named step above `xxl`, not a number in a component.

### 2026-08-26 — The portal serves the brand faces; the field app does not yet
`design/tokens/tokens.ts` names Archivo and IBM Plex Mono, and BUILD-GUIDE says
the drop wins where it disagrees with something invented here. The portal was
naming both in CSS and loading neither, so both silently fell back — while
`layout.tsx` set the body from `fontStack` and got a different answer. Two
answers to "what font is this", one of them fictional.

Both are now served by `next/font/local` from committed woff2 files, bound to
CSS variables that `lib/theme.ts` composes with the shared fallback stack.
*Rejected:* `next/font/google`, which downloads at build time and so makes every
build depend on a CDN being reachable — a build that fails because Google Fonts
is unavailable is a bad failure, and it is not reproducible from a checkout.
80 KB, latin only, OFL, licences committed beside the files.

The field app still renders the system stack: wiring `expo-font` is real work
and it has one scaffold route today. That divergence is named in
`fonts/README.md` and in the typography module rather than left to be
discovered. `theme.test.ts` pins the two family names to the drop, so a new drop
cannot change the brand face and leave the loader behind.

### 2026-08-26 — S3.4 decided: a charity may recognise an auditor, within its own audits
One code, `auditor_code_for(auditor, charity)`, on the report and in the S3.2
picker alike. Being able to ask for the auditor who did well last time is a real
thing a charity wants, and mixing the charity into the hash keeps the code
meaningless to any other charity and never reversible into an identity. The
report reads it through `audit_auditor_code(audit)` rather than calling
`auditor_code_for` directly: handing a client a function that turns auditor ids
into codes invites feeding it ids.

`audit.auditor_id` and `preferred_auditor_id` are withheld from `authenticated`
by column grant, because both are the same uuid for every charity and so are
exactly the cross-charity handle the per-charity code exists not to be.

*Rejected:* the previous report scheme, which coded from the audit reference so
the same auditor read differently in every report. It was the opposite intention
— and it never held anyway, because the uuid was on the row the whole time. Two
deliberate schemes with opposite goals is worse than either.

*Cost, accepted:* `audit` is now granted column by column, so a column added
later is unreadable until it is listed in the migration. `surface.test.ts`
asserts the withheld set exactly, so forgetting names the column in the build.

### 2026-08-26 — No shared component package
The deletion the entry above left open. `packages/ui` was a dependency and a
`transpilePackages` entry of the portal and was imported by nothing after twelve
screens; an unused option is a permanent question about which vocabulary to use.
*Rejected:* adopting it instead — a web component library cannot serve the field
app, so it would have been a third styling vocabulary rather than a shared one,
and the shared vocabulary is `packages/tokens`. Recovering it is one
`git revert`.

### 2026-08-26 — The theme references the design drop rather than copying it
`packages/tokens/src/theme.ts` mapped every role onto a hex literal with the
token name in a trailing comment — `background: '#F4EFE6', // bone`. A new
design drop would change `color.bone` and leave the theme on the old value,
silently, under a comment asserting otherwise, in the one file the whole rebrand
promise rests on. Now every role is `color.<token>`. Verified as a pure
substitution: all 26 literals matched their named token exactly before the
change. `theme.test.ts` asserts no theme names a colour the drop does not have,
and `pnpm check:tokens` fails the build on a colour literal anywhere in `apps/`
or `packages/` outside the drop itself. *Rejected:* a lint rule — Biome cannot
express "no hex outside these two directories", and a fifteen-line grep in CI
beside `check-secrets.sh` costs nothing to maintain.

### 2026-08-26 — Facts that exist twice are compared by a test, not by memory
Some duplication is correct and cannot be removed: the booking form sets its
`min` dates from core's constants because it cannot await a round trip, and a PG
enum is what makes a column self-describing. What was missing was the thing that
fails when the two copies disagree. `in-step.test.ts` compares every enum core
enumerates at runtime against its PG counterpart, in order, and exercises the
booking constants through `book_audit`. `packages/db` gains `@picksel/core` as a
devDependency for it — test-only, and no cycle, since core depends on nothing in
this workspace. *Rejected:* generating one from the other. A code generator is a
build step, a format to learn and a thing to debug, to remove a duplication that
a fifteen-line test makes safe.

### 2026-08-26 — The compliance category is withheld by the database, not by the client
`check_definition` is granted column by column and `compliance_category` is not
among them, so no signed-in role can read it — auditor, client or PICK. The
field app's SQLite schema still leaves it out; that is now a convention on top
of a boundary rather than the boundary itself. Scoring splits to match:
`overallScore()` needs only weight and criticality and is what the client report
calls, `scoreAudit()` keeps the per-category breakdown for a caller that can
legitimately read one. *Rejected:* hiding it in the UI — the field app holds the
anon key and can ask PostgREST for any column it likes, so a UI rule is not a
rule. *Rejected also:* building the admin-facing function to read categories
now; nothing renders a per-category score yet, and the seam is one `security
definer` function when something does.

### 2026-08-26 — Writes go through RPCs; the grant surface is declared, not inherited
`authenticated` may read what RLS allows and may write directly only where no
invariant spans two tables: a field event it minted, a complaint, its own prep
progress. Every other write is a `security definer` function or the service role
in a server action. Table privileges and the callable function list are stated
explicitly in migrations and asserted as inventories in `surface.test.ts`, so a
new table or RPC is unreachable until somebody decides what may touch it.
*Rejected:* keeping the blanket `grant select, insert, update, delete on all
tables` and relying on policies alone — it had already produced three ways to
skip a checked path, and a policy that looks tight is not the same as a
privilege that does not exist. *Rejected also:* per-column grants on `audit` to
keep an admin's direct-write ability; nothing writes `audit` outside an RPC, and
an unused capability is a permanent question.

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
**Superseded on the web by the 2026-08-26 entry above; still current for the
field app.** `fontStack` gives each family a `web` CSS list plus single
`ios`/`android` names, because React Native silently falls back to the default
face if handed a comma-separated stack. Text is set through semantic roles
(`title`, `body`, `code`), so neither app names a size. *Rejected:* bundling
Inter — identical rendering everywhere, at the cost of font files in the binary,
`expo-font` loading, a flash of unstyled text on the web and a licence to track.
Revisit when brand needs a specific face.

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
