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
| RLS on every table | Built | `20260825090700_rls.sql` | every table, asserted by a sweep rather than a count |
| Writes go through RPCs | Built | `20260826230000_writes_go_through_rpcs.sql` | direct INSERT/UPDATE/DELETE revoked except field events, complaints, prep |
| Declared grant surface | Built | `20260826230100_declare_the_whole_surface.sql` | anon holds nothing; the callable function list is explicit |
| Refusal + inventory suites | Built | `packages/db/test/refusals.test.ts`, `surface.test.ts` | what each role must *not* do, and what the schema exposes |
| Append-only enforcement | Built | `20260825090600_append_only.sql` | REVOKE + statement trigger |
| Check catalogue v1 (29 checks) | Built | `seed.sql` | all 10 categories covered |
| Moment/category split | Built | `core/moments.ts` | category absent from field app entirely |
| UUIDv7 ids | Built | `core/ids.ts`, `uuid_generate_v7()` | device-minted for field events |
| Scoring | Built | `core/scoring.ts` | weighted, critical failures separate, 11 tests |
| Postcode area matching | Partial | generated columns on `audit` | area letters only; join, no algorithm yet |
| Credit ledger | Built | `credit_transaction` + balance view | no purchase flow yet |
| Payout ledger | Built | `payout_run` + line items | no run builder or CSV export yet |

## Screens (design manifest)

| ID | Screen | Status |
|---|---|---|
| S1.1 | Book an audit | Built |
| S1.2 | Assignment (six eligibility sets) | Built |
| S1.3 | Job offer | Built |
| S1.4 | Prep | Built |
| S1.5b | Field session — moment stepper | Built |
| S1.6 | Write-up | Built |
| S1.7 | Review queue | Built |
| S1.8 | Client report | Built |
| S1.9 | Client dashboard | Built |
| S2.1 | Offers list | Built |
| S2.2 | Accept + conflict | Built (conflict declaration deferred) |
| S2.3 | Field flag sheet | Built |
| S2.4 | Write-up returned | Built |
| S2.5 | My audits | Built |
| S2.6 | Earnings | Built |
| S2.7 | No-show flow | Built |
| S3.1 | Booking deepened (A/V, lead time) | Built |
| S3.2 | Auditor override picker | Built |
| S3.3 | Audit list + detail | Built |
| S3.4 | Report header — coded auditor | Built (naming is a flag, default off) |
| S3.5 | Credits ledger | Built |
| S3.6 | Complaint fork | Built |
| S4.1 | Ops home | Built |
| S4.2 | Assignment console | Built |
| S4.3+ | Remaining ops screens (auditors, clients, payouts, complaints admin) | Not started |

Screens are wired as components and routes with tests at every level; several
are not yet joined up to navigation in the field app, which has no router
screens beyond the shell.

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
