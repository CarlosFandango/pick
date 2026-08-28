# PICKsel

A two-sided marketplace for UK charity fundraising compliance audits. Charities
buy credits and book audits (£175 each); approved contractor auditors are matched
by postcode and fulfil them in the field, often with no signal.

Solo developer, AI-assisted, 10–15 hours a week. Every decision below is made in
service of that: **share code, keep the surface small, prefer boring**.

---

## The rule that governs the others

**Record everything from day one. Build the logic that consumes it only when
something actually needs it.**

Data you did not capture is gone forever. Code you wrote too early is a liability
you maintain every week until you delete it. So: capture the event, model the
entity, add the column — and stop there. Do not write the aggregation, the rules
engine, the dashboard or the state machine until a real requirement arrives.

Three things this licenses, and one it does not:

- `observation_log.payload` is a JSONB column nothing reads. That is correct.
- `EvidenceAttachment` is a storage pointer with no upload or playback code.
  That is correct.
- `PayoutRun.execution_method` names rails that do not exist yet. Correct.
- It does **not** license a plugin system, an abstract base class, a generic
  "engine", or an interface with one implementation. Openness comes from the
  *data* being complete, not from the *code* being indirect.

## The design is a source of truth, not a suggestion

`design/` holds the committed design drop: **[design/BUILD-GUIDE.md](design/BUILD-GUIDE.md)**
(domain rules, visual rules, copy register), **[design/manifest.md](design/manifest.md)**
(stable screen IDs S1.1–S3.6 → routes) and `design/tokens/tokens.ts`.

- **Screen IDs are the shared vocabulary.** Reference them in commits, branches
  and conversation — "update S2.3", not "the flag thing".
- **`design/tokens/tokens.ts` is the only styling source.** No other colours or
  fonts, anywhere. `@picksel/tokens` re-exports it as semantic roles; components
  use the roles.
- The domain rules in BUILD-GUIDE.md are non-negotiable and were agreed with the
  business. Where they disagree with something invented here, **they win** — and
  the invented thing gets migrated, not mapped around.

## Four registers that must not go stale

Each answers one question, so you can open the one you need instead of reading
all four. **Grep them; do not read them end to end.**

- **[docs/FUNCTIONALITY.md](docs/FUNCTIONALITY.md)** — does this already exist?
  Search it before proposing work.
- **[docs/PATTERNS.md](docs/PATTERNS.md)** — how do we do X? A table of canonical
  approaches. The short one; worth reading whole.
- **[docs/PITFALLS.md](docs/PITFALLS.md)** — why is this behaving impossibly?
- **[docs/DECISIONS.md](docs/DECISIONS.md)** — why was it done this way, and what
  was rejected?

All four are updated **in the same commit as the change they describe**. A
register that lags is worse than no register, because it is trusted and wrong.

### One way to do each thing

`docs/PATTERNS.md` has a table of canonical approaches. Follow it. Before
introducing a *second* pattern for something already listed there, write down in
that file why the existing one cannot work — in the same commit. "It felt
cleaner", "this is more idiomatic" and "I prefer it" are not reasons.

Predictability beats local elegance. Four ways to fetch data cost more than one
slightly imperfect way, because every reader has to learn all four and decide
which applies. When in doubt, copy the nearest existing example.

## Make change cheap

Functionality and design will iterate hard and often. The measure of this
codebase is not how good today's screen is — it is what tomorrow's change costs.

- **One place per fact.** A colour, a status name, a price, a rule: one
  definition, everywhere else references it. Two copies means every change is a
  search, and a search you can fail.
- **Design tokens over values, roles over tokens.** A component naming `#0B5D5C`
  survives one rebrand badly; one naming `danger` survives any number.
- **Push rules into the database where they are invariants**, into `core` where
  they are decisions, and into screens never. A rule in a screen has to be
  rediscovered in the next screen.
- **Prefer deleting to configuring.** An unused option is a permanent question.
  If a variant is parked (S1.5c), park it — do not build a switch for it.
- **Keep the seam, skip the abstraction.** `execution_method` is a column, not a
  strategy pattern. When the second rail arrives it is a function, not a
  refactor.
- **Test the rule, not the render.** Tests pinned to markup make redesign
  expensive, which is exactly when you most need the tests. Test what the rule
  guarantees; let the layout move.
- **Screen IDs are stable, screens are not.** Build S1.1 knowing it will be
  rebuilt. Route, data contract and domain rules stay; the layout is disposable.

When a change feels expensive, that is information: say so, and say what shape
would have made it cheap.

## Flag over-engineering

If you are about to write something in this list, stop and say so before writing:

- A rules or scoring **engine** where an enumerated list would do
- A config table where a TypeScript `as const` array would do
- An abstraction with exactly one implementation
- A queue, cache or worker for something that runs once a week
- A state machine library for a nine-value enum
- Retry/backoff/circuit-breaker machinery around a call that can simply fail
- A generic `Repository<T>` over Supabase's client, which is already that

Saying "this is more than the problem needs, here is the smaller version" is
always a welcome answer, including when the request came from the human.

## How code should be written

- **XP**: small steps, working software at every commit, refactor continuously.
  No long-lived branches; no half-migrated states left overnight.
- **Tests describe behaviour, not implementation.** A test name should read like
  something a charity or an auditor would care about. `packages/core` holds the
  domain logic precisely so it can be tested without a database, a device or a
  network. If a rule matters, it is testable there — if it is not testable there,
  it is probably in the wrong layer.
- **SOLID, at the size this project actually is.** Mostly this means: one module,
  one reason to change; depend on the narrow type you need, not the wide one you
  have. It does not mean adding interfaces to satisfy a letter.
- **Modular and legible.** Someone returning after three weeks away should be able
  to read a file top to bottom and know why it exists. Comment the *why* — the
  decision, the constraint, the thing that would otherwise look wrong. Never
  comment the *what*.
- **Commits are self-contained and revertable.** One coherent change per commit,
  green on its own, with a message saying *why*. `git revert` of any single
  commit should leave the tree working. No "wip", no commit that only makes sense
  alongside the next one, no mixing a refactor with a behaviour change.
- **Extensible without being extended.** The seam should be obvious and unbuilt.
  `execution_method` is the model: adding Stripe Connect later means a new enum
  value and a new function, not a rewrite — and today it costs one column.

---

## Security comes first, and it is not abstract

A single PII breach would end this company. Not "cost us" — end it. We hold the
identities of auditors and charity staff, and `observation_log` bodies describe
**real members of the public** who were approached in the street and never
agreed to be recorded by us. Add A/V evidence and that gets sharper.

So security is not a review checkbox at the end. It is a property of every
change:

- **The database is the boundary.** RLS, not route gating, not a service-layer
  check. Anything the portal enforces in TypeScript, the database must enforce
  too, because a bug or a stolen anon key routes around the portal entirely.
- **Test policies as `authenticated`.** `postgres` and `service_role` bypass
  RLS; `anon` matches no policy, so Postgres returns zero rows without
  evaluating one. All three can pass while the app is wide open or completely
  broken. `pnpm test:rls`.
- **The schema owns its grants.** GRANT decides whether a role may touch a
  table; RLS decides which rows. Never rely on the platform's bootstrap
  defaults for either.
- **`service_role` never leaves the server.** Never in `apps/field`, which ships
  to devices we do not control. `pnpm check:secrets` enforces this.
- **Never log PII.** No auditor names, no observation bodies, no postcodes tied
  to a person, in logs, errors or analytics. When debugging needs a row, use
  its id.
- **We do not hold bank details.** `payout_reference` is an opaque pointer into
  whichever rail is current. Keep it that way.
- **Append-only means append-only.** `observation_log`, `check_result` and
  `credit_transaction` are evidence. An audit trail that can be edited is not
  one.
- **Secrets are never committed.** `.env` files are generated by
  `pnpm env:local`; `.env.example` documents shape, never values.

When a change touches auth, policies, grants or anything reaching
`SUPABASE_SERVICE_ROLE_KEY`, say so plainly and say what you verified.

## Write down what cost you

When a problem takes a long time to find — and either it has bitten more than
once, or it burned real time and looks like it will recur — add it to
`docs/PITFALLS.md` in the same commit as the fix. Record the
symptom, the reason it was hard to see, and the check that would have caught it
sooner. That last part is what makes it useful; without it you are keeping a
diary.

The bar is deliberately high. A one-off typo is not a pitfall. A class of
mistake the tooling will happily let you make again is.

## Architecture

```
apps/
  field/     Expo (React Native, TypeScript). Auditors. Offline-first SQLite.
  portal/    Next.js on Vercel. Client portal + PICK admin, role-gated.
packages/
  api/       Supabase client factories + contract types
  db/        Supabase schema, migrations, generated types
  core/      Domain: entities, zod validation, scoring. No I/O.
  tokens/    Design system: colour roles, spacing, type scale. Both apps.
  ui/        Web components. Portal only — field has its own.
```

`core` is the shared brain and must stay free of I/O, React and platform APIs so
both apps can use it. `ui` is web-only by definition; React Native cannot render
it. Logic shared between the apps lives in `core`; the shared *look* lives in
`tokens`.

### The design system: share the vocabulary, not the components

`packages/tokens` is the single source of brand and layout: colour **roles**,
spacing, type scale, radii, touch targets. It has no dependencies and imports
nothing platform-specific — the moment it imports React or CSS, one app loses it.

Both apps consume it and render it their own way: the portal emits CSS custom
properties via `themeToCssVariables()`, the field app reads the same objects into
React Native styles. A single component library across HTML and React Native
would need an abstraction costing more than it saves; a shared *vocabulary*
delivers the consistent experience and makes rebranding one object, not a sweep
through two codebases.

Rules that keep it working:

- Components reference **roles** (`danger`, `surface`, `title`, `body`), never raw
  hex or numbers. A literal `#0B5FFF`, `padding: 12` or `fontSize: 20` in a
  component is a bug.
- Text uses the semantic scale — `webTextStyle('title')` / `text('title')` — not
  a size. Neither app picks a number, so neither can drift from the other.
- Fonts are the platform system stack, split per platform because React Native
  takes one family name and CSS takes a list. Same typeface where the platform
  has one. A bundled webfont would render identically everywhere but costs font
  files, `expo-font` loading, FOUT and a licence; revisit only when brand
  requires a specific face.
- The portal resets `h1..h6`/`p` margins and sizes. Browser defaults would
  silently override the shared scale and put the two apps out of step.
- A new brand is a new object satisfying `Theme`. The type makes a missing role a
  compile error; `theme.test.ts` checks contrast so a rebrand cannot ship
  unreadable text.
- `success`/`danger` are separated in luminance, not just hue — red/green is the
  common colour-blindness pair and this is a pass/fail product.
- **Colour alone never conveys state.** Always pair it with an icon or label. No
  token test can enforce this; it is on whoever writes the component.
- Field-app touch targets use `touchTarget.comfortable`. Auditors tap one-handed,
  outdoors, while watching something they cannot pause.

### Supabase

One project per environment, **London (eu-west-2)**. One auth system
(`auth.users`), one role per user on `user_profile`:

| Role | Sees |
|---|---|
| `auditor` | Audits assigned to them |
| `client` | Everything belonging to their organisation |
| `pick_admin` | Everything |

RLS enforces this in the database. Route gating in the portal is convenience, not
security — the database is the boundary.

Policies are tested by impersonating `authenticated` (`pnpm test:rls`, run in
CI). Never conclude a policy works from a check made as `postgres`,
`service_role` or `anon`: the first two bypass RLS and the third matches no
policy, so none of them evaluates the expression. A missing GRANT once broke
every signed-in user while passing all three. Where a rule genuinely crosses tenant
lines (inviting a user, recording a credit purchase, matching an audit, building
a payout run) use `createAdminClient()` in a server action, so the rule lives in
testable code rather than in a policy.

### Identifiers: UUIDv7, minted on the device

Field events get their id on the device, before the row exists anywhere. This is
what makes sync idempotent: re-sending a batch is `on conflict do nothing`. There
is no server-side dedup, no merge, no last-writer-wins — **do not add one**.

The client generator (`newId()` in `core`) is monotonic within a millisecond. The
SQL one (`uuid_generate_v7()`) is not. That is why field events are minted on the
device, and why "latest wins" tie-breaks on id only for device-minted rows.

### Append-only tables

`observation_log`, `check_result`, `credit_transaction`. No UPDATE, no DELETE —
enforced twice: `REVOKE` for `anon`/`authenticated`, and a statement-level trigger
that also catches `service_role`.

A correction is a **new row**. Current value = latest `occurred_at` for the key
(see `latestResults()` in `core`). An audit trail that can be edited is not one.

Everything else is ordinary CRUD. Do not make more tables append-only "for
consistency" — it costs read complexity everywhere it touches.

### Dual timestamps

Every field event carries both:

- `occurred_at` — the **device** clock. When it happened. Orders corrections.
- `recorded_at` — the **server** clock. When we heard about it. Server default.

They are never reconciled into one column. An audit that syncs three days late is
a fact worth keeping, not a discrepancy to smooth over.

### Checks have two homes

```
moment              approach → walk_up → opening → pitch → ask → tablet → sign_up → close
compliance_category identification, solicitation_statement, honesty_and_accuracy,
                    vulnerability, pressure_and_persistence, data_protection,
                    consent_and_cancellation, site_conduct, safeguarding, record_keeping
```

`moment` is what the auditor works through — the shape of a real doorstep
interaction, in order. `compliance_category` is what scoring aggregates over.

**Never surface a category to an auditor.** Not in the UI, not in a prompt, not
in the local SQLite schema (it is deliberately absent from `apps/field`). An
auditor who knows a question is "the vulnerability one" answers it differently,
and the audit stops measuring what it claims to measure.

Check prompts are also written to avoid naming their category. When adding a
check, read it aloud: if it telegraphs what it is testing for, reword it.

### Catalogue versioning

`check_definition` rows are immutable in practice: changing a check means a new
`version`. `audit.check_set_version` pins each audit to the catalogue it was run
under, so historical results keep meaning what they meant. `CheckResult` points at
a specific `check_definition.id`, not a code.

### Money

Two ledgers, both permanent, neither with a balance column to drift out of sync:

- **In** — `credit_transaction`, append-only. Balance is `sum(delta)`. A unique
  partial index makes an audit impossible to book twice.
- **Out** — `payout_run` + `payout_line_item`. `execution_method` is a *field*:
  `manual_csv` today, `bank_api` / `stripe_connect` later, writing to the same
  rows. A unique partial index makes an audit impossible to pay twice, across
  every run. **The rails are swappable; the ledger is permanent.**

Money is an integer count of a currency's smallest unit. Never a float, and
never tied to a currency: `formatMoney(minorUnits, currency)` derives its
divisor from the currency, a price carries its currency with it, and no
component prints a `£`. The market is UK today; `residency_zone` already says
it will not stay that way.

### Residency

`organisation.residency_zone` exists from day one (`uk` | `eea` | `other`) and is
not yet consulted by anything. Backfilling it after the fact would be guesswork,
so it is captured now.

### A/V evidence

`evidence_attachment` models a pointer: bucket, path, mime type, size, hash. There
is no upload, transcode, streaming or playback code, and none should be written
until A/V is actually scheduled. Recording people on the street has consent and
retention consequences that are a product decision, not an implementation detail.

### Postcode matching

v1 matches on outward-code **area** letters (`SW`, `M`, `EH`) — coarse and
deliberately so. `audit.postcode_area` is a stored generated column, so matching
is a join and there is no parsing logic in application code. Districts, radii or
travel time can come when demand shows the coarse version failing.

---

## Conventions

- **Package manager**: pnpm, hoisted node linker (`.npmrc`) — React Native needs it.
- **Lint + format**: Biome. One tool, one config, no plugin churn. `pnpm lint:fix`.
- **Tests**: Vitest. Domain tests live in `packages/core/test`.
- **SQL**: lower case keywords, one migration per concern, never edit a migration
  that has been pushed to staging.
- **Migrations are the only way the schema changes.** Never `db execute` a blob,
  never change something in Studio and leave it, never hand-run SQL against a
  hosted project. If it is not in `packages/db/supabase/migrations`, it does not
  exist — the next `db reset` will prove it.
  Each migration is a file of **explicit, readable statements**: one concern per
  file, one object per statement. No `DO` blocks assembling DDL with `format()`
  and `execute`, and no loops over table names. Dynamic SQL cannot be grepped,
  cannot be diffed, and reports failures against a generated string rather than
  the line you wrote. Repeating three near-identical `create trigger` statements
  is the correct trade.
- **Env**: `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` are shipped to the client — safe
  values only. Everything else is server-only. `SUPABASE_SERVICE_ROLE_KEY` must
  never be imported from `apps/field`. See `.env.example`.
- **Generated from the schema**: `packages/db/src/types.generated.ts` and
  `packages/db/src/schema.generated.sql`. Regenerate both with `pnpm db:generate`
  after any migration; never hand-edit either.
- **To learn the current schema, read the snapshot, not the migrations.**
  `schema.generated.sql` is what the database *is*; the 39 migrations are how it
  got there, and answering from them means replaying every `alter` in order.
  `awk '/CREATE TABLE IF NOT EXISTS "public"."audit"/,/^\);/'` returns the whole
  current table. Read migrations to learn *why* a thing changed, never *what* it is.

## Commands

```bash
pnpm install
pnpm db:start          # local Supabase (Docker)
pnpm db:reset          # re-apply migrations + seed
pnpm db:generate       # regenerate types + schema snapshot — after every migration
pnpm dev               # all apps
pnpm check             # lint + typecheck + unit/component tests — seconds
pnpm verify            # the lot, including build, RLS and Playwright — minutes
```

## What exists and what does not

See **[docs/FUNCTIONALITY.md](docs/FUNCTIONALITY.md)** — including a *Deferred*
table giving the reason each unbuilt thing is unbuilt, so nobody adds it by
reflex and the gaps stay visible on purpose.
