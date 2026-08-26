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
| Write across tenants | a server action with `createAdminClient()` | loosening an RLS policy |
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
| Add a check to the catalogue | new `check_definition` row, new `version` | editing an existing row |
| Represent money | integer pence, `_pence` suffix | float, decimal string, `Money` class |
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
| Set text size or weight | `webTextStyle(role)` / `text(role)` | `fontSize:` in a component |
| Set a font family | `fontStack`, via the text role | naming a font in a component |
| Add a brand | a new object satisfying `Theme` | overriding CSS, forking components |
| Style a portal component | token scales inline + `var(--colour-*)` | a CSS file with its own palette |
| Link between portal screens | `next/link`, to a route with a `page.tsx` | a bare `<a href>`, or a route the design has not got |
| Offer an action with no screen yet | `href` returning `null`, so no link renders | pointing at the route the screen will one day have |
| Style a field component | the same token objects as RN styles | a parallel RN colour constant |
| Convey pass/fail | colour **and** an icon or label | colour alone |
| Size a field tap target | `touchTarget.comfortable` | an arbitrary height |

## Naming

- Database: `snake_case`, **singular** table names (`audit`, not `audits`).
- TypeScript: `camelCase` values, `PascalCase` types, files named after their export.
- Timestamps: `*_at`. Dates without time: `*_on`. Money: `*_pence`. Flags: `is_*`.
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

### A function that was replaced, and wasn't
**Symptom:** two `book_audit`s. The rebuilt one refused a window starting inside
the lead time; the original, still granted, did not.
**Why it hid:** `create or replace function` replaces a function with the *same*
argument list. 20260826180000 added a ninth parameter, so it created an
overload and left the eight-argument version installed — and the migration reads
exactly like a replacement. It was visible the whole time in
`types.generated.ts`, where `book_audit` was a union of two signatures, and that
union read as a generator quirk rather than a fact about the schema.
**Caught now by:** `surface.test.ts` asserting no overloaded function name in
`public`. A deliberate overload will fail that test, which is the right moment
to ask whether both signatures should be reachable.

### Green typecheck, broken build
**Symptom:** `tsc` clean; `next build` fails on `Can't resolve './primitives.js'`,
then on `Cannot read properties of null (reading 'useRef')`.
**Why it hid:** `tsc` resolves `./x.js` to `x.ts` and bundlers do not; and two
copies of React in one tree only misbehave at prerender. Neither is visible to
lint, typecheck or unit tests.
**Caught now by:** `pnpm build` in CI.

## Decision log

Newest first. Record the alternative that was rejected — that is the part that
stops the decision being relitigated.

### 2026-08-26 — No shared component package
`packages/ui` held a Button and a Card, was a dependency and a
`transpilePackages` entry of the portal, and was imported by nothing after
twelve screens were built. It was not a partial implementation of the canonical
pattern — the portal styles inline from token roles, which is what PATTERNS says
to do — it was a competing one, sitting there as a permanent question about
which to use. Deleted. *Rejected:* adopting it instead; a web component library
cannot serve the field app, so it would have been a third styling vocabulary
rather than a shared one, and the shared vocabulary is `packages/tokens`.
Recovering it is one `git revert`.

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
