# Functionality register

What exists, what is coming, what was deliberately left out. **Update this in the
same commit as the change** — a register that lags is worse than none.

Status: **Built** = working and tested · **Partial** = usable, gaps noted ·
**Planned** = agreed, not started · **Deferred** = deliberately not built, with a
reason. Deferred is a real answer and should stay populated.

## Foundations

| Capability | Status | Lives in | Notes |
|---|---|---|---|
| Turborepo monorepo, pnpm workspaces | Built | root | hoisted node-linker for React Native |
| CI: lint / typecheck / test | Built | `.github/workflows/ci.yml` | plus a job that applies migrations from scratch |
| Staging migration deploy | Built | `.github/workflows/deploy-staging.yml` | manual + on migration change; production is promoted by hand |
| Local Supabase stack | Built | `packages/db/supabase` | analytics off locally — see config.toml |
| Generated database types | Built | `packages/db/src/types.generated.ts` | `pnpm db:types` after every migration |
| Env conventions | Built | `.env.example` | `*_PUBLIC_*` = shipped to client |

## Domain

| Capability | Status | Lives in | Notes |
|---|---|---|---|
| Schema: 12 tables, 15 enums, 1 view | Built | `packages/db/supabase/migrations` | verified on PG17 |
| RLS on every table | Built | `20260825090700_rls.sql` | 12/12 enabled, verified |
| Append-only enforcement | Built | `20260825090600_append_only.sql` | REVOKE + statement trigger |
| Check catalogue v1 (29 checks) | Built | `seed.sql` | all 10 categories covered |
| Moment/category split | Built | `core/moments.ts` | category absent from field app entirely |
| UUIDv7 ids | Built | `core/ids.ts`, `uuid_generate_v7()` | device-minted for field events |
| Scoring | Built | `core/scoring.ts` | weighted, critical failures separate, 11 tests |
| Postcode area matching | Partial | generated columns on `audit` | area letters only; join, no algorithm yet |
| Credit ledger | Built | `credit_transaction` + balance view | no purchase flow yet |
| Payout ledger | Built | `payout_run` + line items | no run builder or CSV export yet |

## Applications

| Capability | Status | Lives in | Notes |
|---|---|---|---|
| Portal shell + session refresh | Partial | `apps/portal` | middleware + `requireRole()`; no screens |
| Role gating helper | Built | `portal/src/lib/auth.ts` | gate only — RLS is the real boundary |
| Field app shell | Partial | `apps/field` | expo-router, one screen |
| Local SQLite schema + migrator | Built | `field/src/db` | `synced_at is null` **is** the outbox; 9 tests incl. resume-from-partial |
| Sync push | Built | `field/src/sync/outbox.ts` | 10 tests: batching, failure isolation, payload parsing, idempotence |
| Supabase clients (web/server/native) | Built | `packages/api` | admin client is server-only |
| Shared web components | Partial | `packages/ui` | Button, Card — token-driven placeholders |
| Design tokens + themes | Built | `packages/tokens` | light/dark, WCAG AA contrast |
| Typography scale + fonts | Built | `packages/tokens/src/typography.ts` | 5 semantic roles; web and native verified identical by test |
| Rebranding via theme object | Built | `packages/tokens/src/theme.ts` | `Theme` type makes a missing role a compile error |
| Portal theming | Built | `portal/src/app/layout.tsx` | CSS custom properties generated from tokens |
| Field theming | Built | `field/src/theme.ts` | same tokens as RN styles, follows system scheme |

## Known gaps in what exists

| Gap | Where | Why it matters |
|---|---|---|
| No tests for role gating | `portal/src/lib/auth.ts` | Thin, and RLS is the real boundary — needs a Supabase client double to be worth doing. |
| No end-to-end RLS tests | `packages/db` | Policies are verified by hand against a running stack, not in CI. A `pgTAP` suite or a seeded-JWT integration test would catch a policy regression. |

## Not built yet

Sign-in screens · audit booking flow · matching algorithm · report generation ·
notifications · payment capture · payout CSV export · auditor onboarding ·
scheduled jobs · analytics dashboards

## Deferred, with reasons

| Not building | Why | Revisit when |
|---|---|---|
| A/V capture and playback | Consent and retention are product decisions, not implementation details. The pointer entity exists so nothing is lost. | A/V is actually scheduled |
| Reading `observation_log.payload` | Capture now, decide later. Querying it would freeze a shape we have not chosen. | A real report needs a field in it |
| Real payout rails | `execution_method` makes them swappable. Manual CSV is correct at this volume. | Volume makes manual painful |
| Balance/score cached columns | `sum(delta)` and on-the-fly scoring are fast at this size and cannot drift. | A query is measurably too slow |
| Postcode districts / travel radius | Area letters are coarse but sufficient to test the model. | Matching visibly fails |
| Column-level update rules on profiles | Writes go through server actions where they are testable. | Users need self-service editing |
