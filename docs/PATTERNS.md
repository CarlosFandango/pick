# Patterns

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
| Create an account for someone | `createAdminClient()` + `generateLink`, in a server action | letting a device or a policy do it |
| Let someone act on themselves once | a `security definer` function taking **no id**, gated on their own state | an id parameter plus a check that it is theirs |
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
| Change the schema | a new migration, then `pnpm db:generate` | editing a pushed migration, `db execute`, an unexported Studio change |
| Find out what the schema is now | grep `packages/db/src/schema.generated.sql` | reading the migration history and replaying the `alter`s |
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
- Schema and the output of `pnpm db:generate` land together; separately, one of
  them is broken.
- Subject line says *what*; the body says *why*. The diff already says how.

## The two registers that grew out of this file

Both were here until they were not worth the cost of being here: this file is
read to answer "how do we do X", and it was carrying 350 lines that answer a
different question. They are still updated in the same commit as the change
they describe — they just are not read every time someone wants the table above.

- **[PITFALLS.md](PITFALLS.md)** — mistakes that were expensive to find and will
  recur. Read when something is behaving impossibly. Add to it when a problem
  took a long time to find *and* looks like a class rather than a typo.
- **[DECISIONS.md](DECISIONS.md)** — what was chosen, what was rejected, and why.
  Read when you are about to question a decision. Add to it when you make one.
