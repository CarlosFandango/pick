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

## Two documents that must not go stale

- **[docs/FUNCTIONALITY.md](docs/FUNCTIONALITY.md)** — what is built, partial,
  planned and deliberately deferred, and where each thing lives. Read it before
  proposing work; it is the fastest way to see whether something already exists.
- **[docs/PATTERNS.md](docs/PATTERNS.md)** — the canonical way to do each
  recurring thing, plus a decision log recording what was rejected and why.

Both are updated **in the same commit as the change they describe**. A register
that lags is worse than no register, because it is trusted and wrong.

### One way to do each thing

`docs/PATTERNS.md` has a table of canonical approaches. Follow it. Before
introducing a *second* pattern for something already listed there, write down in
that file why the existing one cannot work — in the same commit. "It felt
cleaner", "this is more idiomatic" and "I prefer it" are not reasons.

Predictability beats local elegance. Four ways to fetch data cost more than one
slightly imperfect way, because every reader has to learn all four and decide
which applies. When in doubt, copy the nearest existing example.

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

- Components reference **roles** (`danger`, `surface`), never raw hex or numbers.
  A literal `#0B5FFF` or `padding: 12` in a component is a bug.
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
security — the database is the boundary. Where a rule genuinely crosses tenant
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

Money is integer pence. Never a float.

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
- **Types**: `packages/db/src/types.generated.ts` is generated. Regenerate with
  `pnpm db:types` after any migration; never hand-edit it.

## Commands

```bash
pnpm install
pnpm db:start          # local Supabase (Docker)
pnpm db:reset          # re-apply migrations + seed
pnpm db:types          # regenerate Database types — after every migration
pnpm dev               # all apps
pnpm typecheck && pnpm lint && pnpm test
```

## What exists and what does not

See **[docs/FUNCTIONALITY.md](docs/FUNCTIONALITY.md)** — including a *Deferred*
table giving the reason each unbuilt thing is unbuilt, so nobody adds it by
reflex and the gaps stay visible on purpose.
