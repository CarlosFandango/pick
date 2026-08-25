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
| Sync from device | device-minted id + `on conflict do nothing` | merge, last-writer-wins, server dedup |
| Queue unsent work | `synced_at is null` on the row itself | a separate outbox table |
| Validate input | a zod schema in `core/entities.ts`, parsed at the boundary | ad-hoc `if` checks, validating twice |
| Add a closed set of values | `as const` array in `core` + a PG enum, kept in step | a lookup table, a config file, a string |
| Add a check to the catalogue | new `check_definition` row, new `version` | editing an existing row |
| Represent money | integer pence, `_pence` suffix | float, decimal string, `Money` class |
| Derive a value from a column | a stored generated column | parsing in application code |
| Enforce an invariant | a CHECK or unique partial index | a service-layer guard alone |
| Handle a failure | let it throw at the boundary and surface it | retry loops, backoff, circuit breakers |
| Test domain logic | Vitest in `packages/core/test`, no I/O | a test that needs a database or device |
| Change the schema | a new migration, then `pnpm db:types` | editing a pushed migration, `db execute`, an unexported Studio change |
| Write DDL | explicit statements, one object each | a `DO` block building SQL with `format()`/`execute` |
| Repeat DDL across tables | write it out per table | loop over a table-name array |
| Share code between apps | `packages/core` | `packages/ui` (web only — RN cannot render it) |
| Colour, spacing, type size | a role or scale from `@picksel/tokens` | a hex literal, a magic number |
| Add a brand | a new object satisfying `Theme` | overriding CSS, forking components |
| Style a portal component | token scales inline + `var(--colour-*)` | a CSS file with its own palette |
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

## Decision log

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
