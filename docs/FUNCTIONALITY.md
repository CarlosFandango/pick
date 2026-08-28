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
| Hosted Supabase: staging | Built | London (eu-west-2), ref in `.env` | linked; all 26 migrations applied, 18 tables live and empty. No seed — `seed.sql` is local-only by design. |
| Hosted Supabase: production | Planned | London (eu-west-2) | project exists, nothing pushed. Promoted by hand, and not needed until there is something to protect. |
| CI deploy to staging | Partial | `.github/workflows/deploy-staging.yml` | still skips with a notice: needs `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` as GitHub secrets. Pushing from a laptop is not a pipeline. |
| RLS verified against hosted | Not started | — | `pnpm test:rls` has only ever run locally and in CI. Both grant pitfalls came from bootstrap differences, so a hosted run is the point — see TND-86. |
| Local Supabase stack | Built | `packages/db/supabase` | analytics off locally — see config.toml |
| Generated database types | Built | `packages/db/src/types.generated.ts` | `pnpm db:generate` after every migration |
| Generated schema snapshot | Built | `packages/db/src/schema.generated.sql` | current-state DDL, so schema questions cost one lookup instead of a sweep of 39 migrations |
| Env conventions | Built | `.env.example` | `*_PUBLIC_*` = shipped to client |
| Agent tool permissions | Built | `.claude/settings.json` | read-only commands and the project's own safe scripts, pre-allowed. Local overrides go in `settings.local.json`, which is ignored. |
| Linear (project management) | Built | `.mcp.json` | project-scoped MCP server, approved via `enabledMcpjsonServers`. The account-wide claude.ai connectors are disabled for this repo — their tool definitions load on every request. |

## Domain

| Capability | Status | Lives in | Notes |
|---|---|---|---|
| Schema: 12 tables, 15 enums, 1 view | Built | `packages/db/supabase/migrations` | verified on PG17 |
| RLS on every table | Built | `20260825090700_rls.sql` | 12/12 enabled; 25 tests impersonating real roles, run in CI |
| Append-only enforcement | Built | `20260825090600_append_only.sql` | REVOKE + statement trigger |
| Check catalogue v1 (29 checks) | Built | `seed.sql` | all 10 categories covered |
| Moment/category split | Built | `core/moments.ts` | category absent from field app entirely |
| Audit stages, two capture modes | Built | `audit_stage_template`, `core/stages.ts` | TND-83. Seeded per audit type; sequence is data, so Jaz's walkthrough is a seed change |
| What each stage permits | Built | `audit_capture_mode`, S4.10 `/admin/stages` | TND-83. Was an enum plus a `switch` in core; now a row with `allows_tallies` / `allows_notes` / `allows_markers`, editable by PICK admin. A third stage is an insert |
| Stage sequence editing | Partial | S4.10 `/admin/stages` | Read-only. Reordering has to publish a new `stage_set_version` rather than move rows an in-flight shift is reading — same argument as TND-84 |
| UUIDv7 ids | Built | `core/ids.ts`, `uuid_generate_v7()` | device-minted for field events |
| Scoring | Built | `core/scoring.ts` | weighted, critical failures separate, 11 tests |
| Postcode area matching | Partial | generated columns on `audit` | area letters only; join, no algorithm yet |
| Credit ledger lifecycle | Built | `20260826290100_credit_lifecycle.sql` | reserve at booking, consume at release, release on void/no-show. FIFO by purchase date; each credit carries what it cost |
| Credit position (5 figures) | Built | `organisation_credit_position` view | purchased / reserved / consumed / released / available, all folds over the ledger |
| Atomic reservation | Built | `book_audit` locks the organisation row | two bookings against a last credit can no longer both succeed |
| Credit expiry | Deferred | enum value only | the type exists, nothing writes it — the policy is an open decision |
| Credit price list | Built | `credit_bundle`, `core/credits.ts` | five bundles, seeded. Price is read, never a constant — a price in code would rewrite past purchases |
| Feature flags | Built | `core/features.ts` | `avEvidence` off; enforced in the action, not just hidden |
| Currency-generic money | Built | `core/money.ts`, `20260826230000_currency_generic_money.sql` | `formatMoney(minorUnits, currency)`; columns are `_minor_units`. No currency column yet — see PATTERNS |
| Payout ledger + run builder | Built | `20260826320000_payout_runs.sql` | draft → approve → executed. Payable is decided by the payment gate, never by client approval. No CSV export yet |
| Review gates | Built | `review_gate`, `20260826310000_review_gates.sql` | TND-81. Six fixed triggers; payment and client-release resolve independently; most restrictive wins |
| Risk register | Built | `risk`, `risk_advisory`, `assignment_override` | TND-82. Conflict hard-blocks; exposure warns and auto-raises a risk. The advisory is a separate record |

## Screens (design manifest)

| ID | Screen | Status |
|---|---|---|
| S1.1 | Book an audit | Built |
| S1.2 | Assignment (six eligibility sets) | Built |
| S1.3 | Job offer | Built |
| S1.4 | Prep | Built |
| S1.5b | Field session — stage stepper, per-stage capture | Built (stage list awaiting Jaz's walkthrough) |
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
| S4.3 | Auditor roster — vetting, coverage, capability | Built |
| S4.4 | Audits — list and situation report | Built |
| S4.5 | Clients — roster, balances, credit adjustments | Built |
| S4.6 | Complaint — read, acknowledge, resolve | Built (minimal). TND-80 adds triage paths and PICK-authored rework beside it |
| S4.7 | Payout runs | Built |
| S4.8 | Risk register | Built |
| S4.9 | Review gates | Built |

Screens are wired as components and routes with tests at every level. The
auditor loop closes: an auditor can now sign in, take an offer, prep, run a
session, report a no-show and submit a write-up, which is what moves an audit
into review without anyone touching the database.

The write-up groups by moment. Stages 3-9 map 1:1 onto those moments, so what
TND-83 adds is a summary of the observation stage rather than a rebuild.

## Applications

| Capability | Status | Lives in | Notes |
|---|---|---|---|
| Portal shell + session refresh | Partial | `apps/portal` | middleware + `requireRole()`; no screens |
| Back navigation on detail pages | Built | `portal/src/components/BackLink.tsx` | a link to a named place, never `router.back()` |
| Not-found page | Built | `portal/src/app/not-found.tsx` | session-free; copy does not confirm a record exists |
| Role gating helper | Built | `portal/src/lib/auth.ts` | gate only — RLS is the real boundary |
| Sign out | Built | `portal/src/lib/sign-out.ts` | form POST from both shells; never a GET link |
| Field app routes | Built | `apps/field/app` | tabs (offers / my audits / earnings) + offer, prep, session, write-up, no-show |
| Field app navigation | Built | `app/(tabs)/_layout.tsx` | tab bar, back on detail screens, none on a live session |
| Device auth | Built | `field/src/lib/session.tsx`, `lib/supabase.ts` | AsyncStorage session; `ready` kept separate from `session` so a cold start does not sign anyone out |
| Row-to-prop adapters | Built | `field/src/lib/adapters.ts` | the layer that was missing; 18 tests, no network |
| Local field-event writes | Built | `field/src/lib/events.ts` | device-minted ids, device clock, left queued |
| Sync trigger | Built | `field/src/lib/sync.ts` | called where signal is likely, never on a timer; never throws |
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

Portal sign-in design (scaffolding today) · report generation · notifications ·
payment capture · payout CSV export · auditor onboarding · scheduled jobs ·
analytics dashboards

## Deferred, with reasons

| Not building | Why | Revisit when |
|---|---|---|
| A/V capture and playback | Consent and retention are product decisions, not implementation details. The pointer entity exists so nothing is lost. | A/V is actually scheduled |
| Reading `observation_log.payload` | Capture now, decide later. Querying it would freeze a shape we have not chosen. | A real report needs a field in it |
| Real payout rails | `execution_method` makes them swappable. Manual CSV is correct at this volume. | Volume makes manual painful |
| Balance/score cached columns | `sum(delta)` and on-the-fly scoring are fast at this size and cannot drift. | A query is measurably too slow |
| Postcode districts / travel radius | Area letters are coarse but sufficient to test the model. | Matching visibly fails |
| Column-level update rules on profiles | Writes go through server actions where they are testable. | Users need self-service editing |
