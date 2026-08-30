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
| Hosted Supabase: staging | Partial | London (eu-west-2), ref in `.env` | linked, but last pushed by hand at 26 migrations. 13 have landed since, so staging is behind `main` until TND-86 wires the deploy. No seed — `seed.sql` is local-only by design. |
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
| Schema: 25 tables, 33 enums, 2 views | Built | `packages/db/supabase/migrations` | 39 migrations, verified on PG17. Counts are from `schema.generated.sql` — regenerate and recount rather than incrementing by hand |
| RLS on every table | Built | `20260825090700_rls.sql` | 12/12 enabled; 25 tests impersonating real roles, run in CI |
| Append-only enforcement | Built | `20260825090600_append_only.sql` | REVOKE + statement trigger |
| Check catalogue v1 (29 checks) | Built | `seed.sql` | all 10 categories covered |
| Moment/category split | Built | `core/moments.ts` | category absent from field app entirely |
| Audit stages, two capture modes | Built | `audit_stage_template`, `core/stages.ts` | TND-83. Seeded per audit type; sequence is data, so Jaz's walkthrough is a seed change |
| What each stage permits | Built | `audit_capture_mode`, S4.10 `/admin/stages` | TND-83. Was an enum plus a `switch` in core; now a row with `allows_tallies` / `allows_notes` / `allows_markers`, editable by PICK admin. A third stage is an insert |
| Stage sequence editing | Partial | S4.10 `/admin/stages` | Read-only. Reordering has to publish a new `stage_set_version` rather than move rows an in-flight shift is reading — same argument as TND-84 |
| UUIDv7 ids | Built | `core/ids.ts`, `uuid_generate_v7()` | device-minted for field events |
| Scoring | Built | `core/scoring.ts` | weighted, critical failures separate, 11 tests |
| Place matching | Built | `place`, `auditor_coverage.place_id` | one join. A gazetteer seeded per country, so a second country is rows rather than a migration |
| Travel-based coverage | Built | `places_within_reach()`, `set_auditor_coverage()` | an auditor gives minutes and mode; the circle proposes places and they confirm. Removals kept as `excluded` |
| Credit ledger lifecycle | Built | `20260826290100_credit_lifecycle.sql` | reserve at booking, consume at release, release on void/no-show. FIFO by purchase date; each credit carries what it cost |
| Credit position (5 figures) | Built | `organisation_credit_position` view | purchased / reserved / consumed / released / available, all folds over the ledger |
| Atomic reservation | Built | `book_audit` locks the organisation row | two bookings against a last credit can no longer both succeed |
| Credit expiry | Deferred | enum value only | the type exists, nothing writes it — the policy is an open decision |
| Credit price list | Built | `credit_bundle`, `core/credits.ts` | five bundles, seeded. Price is read, never a constant — a price in code would rewrite past purchases |
| Feature flags | Built | `core/features.ts` | `avEvidence` off; enforced in the action, not just hidden |
| Currency-generic money | Built | `core/money.ts`, `20260826230000_currency_generic_money.sql` | `formatMoney(minorUnits, currency)`; columns are `_minor_units`. No currency column yet — see PATTERNS |
| Payout ledger + run builder | Built | `20260826320000_payout_runs.sql` | draft → approve → executed. Payable is decided by the payment gate, never by client approval. No CSV export yet |
| Review gates | Partial | `review_gate`, `20260826310000_review_gates.sql` | TND-81. Six fixed triggers; payment and client-release resolve independently; most restrictive wins. **`timeout_days`/`on_timeout` are stored and displayed but nothing applies them** — there is no scheduler, so a hold lasts until a human opens the queue. No first-class review-outcome event either; the outcome lands in the mutable `audit.review_note` |
| Risk register | Built | `risk`, `risk_advisory`, `assignment_override` | TND-82. Conflict hard-blocks; exposure warns and auto-raises a risk. The advisory is a separate record |
| The sentence a screen opens with | Built | `core/lede.ts`, `core/dashboard.ts`, `core/admin-ledes.ts`, `core/eligibility.ts` | Derived once in the domain, never composed in a screen. The payouts screen shipped a headline contradicting its own list the first time both answered the same question separately |
| Client-facing check prose | Built | `check_definition.client_finding` / `client_rationale` | Written as bare predicates so two findings join into one sentence. Not a catalogue version bump — describes the same test to a different audience |
| How an audit has gone | Built | `core/timeline.ts` | Derived from timestamps the row already carried and nothing read. Never names the auditor |
| Report read receipt | Built | `audit.report_read_at`, `mark_report_read()` | Security-definer function, not an UPDATE policy. Without it "ready to read" only ever grows |
| Eligibility, test by test | Built | `assignment_console` booleans, `core/eligibility.ts` | `nearestFix` names one thing to do; it never names a conflict, which is not overridable |
| Field surface roles | Built | `apps/field/src/surface.ts` | The field app is dark. Roles, not tokens — and a contrast test that was verified to fail on the bug that prompted it |

## Screens (design manifest)

| ID | Screen | Status |
|---|---|---|
| S1.1 | Book an audit | Built |
| S1.2 | Assignment (six eligibility sets) | Built |
| S1.3 | Job offer | Built |
| S1.4 | Prep | Built |
| S1.5b | Field session — stage stepper, per-stage capture | Built (stage list awaiting Jaz's walkthrough) |
| S1.6 | Write-up | Built |
| S1.7 | Review queue | Built — the two gates resolve separately on screen, beside what the auditor logged live during the shift |
| S1.8 | Client report | Built — verdict first. Leads with what happened in a sentence, then the encounter in order; the weighted percentage is a footnote |
| S1.9 | Client dashboard | Built — grouped by what each group means (ready / under way / waiting / finished), not by the status enum |
| S2.1 | Offers list | Built |
| S2.2 | Accept + conflict | Built (conflict declaration deferred) |
| S2.3 | Field flag sheet | Built |
| S2.4 | Write-up returned | Built |
| S2.5 | My audits | Built |
| S2.6 | Earnings | Built |
| S2.7 | No-show flow | Built |
| S3.1 | Booking deepened (A/V, lead time) | Built |
| S3.2 | Auditor override picker | **Not built** — `app/book/choose-auditor/` is an empty directory, so the manifest route 404s and nothing calls `prefer_auditor()`. The conflict hard-block is enforced and tested in the database; no client can reach it or be told why it cannot be waived (TND-82) |
| S3.3 | Audit list + detail | Built — detail answers "is anything expected of me" and shows how the audit has gone |
| S3.4 | Report header — coded auditor | Built (naming is a flag, default off) |
| S3.5 | Credits ledger | Built |
| S3.6 | Complaint fork | Built |
| S4.1 | Ops home | Built — the queue leads and the counters are subordinate to it. Overdue is per kind |
| S4.2 | Assignment console | Built — a table, one column per eligibility test. The one screen where the timeline pattern deliberately does not apply |
| S4.3 | Auditor roster — vetting, coverage, capability | Built — a pending auditor opens out with a checklist. The auditor agreement shows as NOT RECORDED, because there is no field for it (TND-58) |
| S4.4 | Audits — list and situation report | Built |
| S4.5 | Clients — roster, balances, credit adjustments | Built |
| S4.6 | Complaint — read, acknowledge, resolve | Built — now gathers the evidence a decision needs: what they wrote, what the audit found, what was logged live. Still stops short of TND-80's three named outcomes, which need an outcome enum and a credit movement |
| S4.7 | Payout runs | Built |
| S4.8 | Risk register | Built |
| S4.9 | Review gates | Built |
| S5.1 | Invite an auditor | Built |
| S5.2 | Welcome — accept an invitation | Built — coverage is a place, minutes and a mode of travel; the circle proposes places and the auditor confirms. Postcode areas appear nowhere |
| S5.3 | Auditor home | Built (parts 1–3; complaints deferred to TND-97) — opens with what is due today |

Every screen above now opens with the one thing the person came for and then
lets them read down for the evidence — except the assignment console, which
gets a table because six parallel eligibility rules have no order to read down.
The sentence is always derived in `core`, never composed in the screen.

Screens are wired as components and routes with tests at every level, with one
exception: S3.2 above. A row here saying Built means a route a user can reach —
not a rule enforced in the database behind a route that does not exist. The
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
| Auditor onboarding (invite) | Built | S5.1/S5.2, `complete_auditor_profile` | TND-92. PICK invites, the link is shown once and never stored, the invitee sets their own password and coverage. Accepting never touches `approval_status` — vetting stays PICK's |
| Auth callback | Built | `portal/src/app/auth/callback/route.ts` | exchanges an invite code for a session; password sign-in never issues one |
| Sign out | Built | `portal/src/lib/sign-out.ts` | form POST from both shells; never a GET link |
| Field app routes | Built | `apps/field/app` | tabs (offers / my audits / earnings) + offer, prep, session, write-up, no-show |
| Field app navigation | Built | `app/(tabs)/_layout.tsx` | tab bar, back on detail screens, none on a live session. Home is the landing tab (TND-95); Offers is one along |
| Auditor payment state | Built | `core/payment.ts`, S5.3 | TND-95. Five states off the auditor's own audit status and payout line. Never consults the review gate, so a client-release hold cannot leak — asserted by a test that scans the rendered screen for the words |
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
payment capture · payout CSV export · public auditor sign-up · scheduled jobs ·
analytics dashboards

## Deferred, with reasons

| Not building | Why | Revisit when |
|---|---|---|
| A/V capture and playback | Consent and retention are product decisions, not implementation details. The pointer entity exists so nothing is lost. | A/V is actually scheduled |
| Reading `observation_log.payload` | Capture now, decide later. Querying it would freeze a shape we have not chosen. | A real report needs a field in it |
| Real payout rails | `execution_method` makes them swappable. Manual CSV is correct at this volume. | Volume makes manual painful |
| Balance/score cached columns | `sum(delta)` and on-the-fly scoring are fast at this size and cannot drift. | A query is measurably too slow |
| Real journey times | Straight-line distance with a factor per mode, and the screen says so. The auditor corrects what it gets wrong, and the correction is what is stored. | An estimate is wrong often enough that people notice |
| A complete gazetteer | Around 75 places: the urban centres plus everywhere the seed uses. Filling in the rest is a data-loading job against ONS or OpenStreetMap, not hand-writing. | An audit is booked somewhere absent |
| Column-level update rules on profiles | Writes go through server actions where they are testable. | Users need self-service editing |
| Auditor complaints on home (TND-95 part 4) | "Complaint management" for an auditor is two different builds — rework reaching them, or issues they raise — and one is an entity that does not exist. Guessing would build the wrong thing, and safety reports may not belong in a queue at all. | TND-97 comes back from Jaz |
| An audit detail screen in the field app | Home and My Audits both send an auditor to the thing that is *due* — prep, or the write-up. A read-only detail screen would be a second tap to nothing actionable. | An auditor needs something on it they cannot get from prep |
| Public auditor sign-up (`/auditors/apply`) | Invite-only is smaller and matches how recruitment actually happens — one conversation at a time. The application form and `complete_auditor_profile` are already shared, so the public route is a second front door, not a second model. | Recruiting outgrows hand-sent invitations |
| Emailing the invitation | `generateLink` returns a URL the admin sends however they already talk to that person. SMTP is a deployment concern with nothing to test against locally. | Invitations outgrow copy and paste |
| Notifications | The absence underneath half the design drop: six of the eighteen screens say some version of "we will let you know" and none of them can. An offer expiring in four hours, a report going live, a write-up coming back, vetting finishing — all silent. It is a system with a scheduler, a channel and a preference model, not a screen, and TND-81's review timeouts need the same scheduler. **The screens work without it; the product does not.** | The scheduler exists (TND-81) — build both together or neither |
| Timing promises in copy | The designs say "two or three working days" for vetting and "report expected Monday". Nothing measures either, and a promise the system cannot keep is worse than silence. Where a date is real — an audit window — it is shown. | Something measures turnaround |
| PDF export of a report | A button that does nothing is worse than its absence, and print styles are not a substitute for a document a charity forwards to an agency. | A charity asks for one twice |
| The coverage gap ("nobody covers SE for lottery") | Named on the ops home design and computed by nothing. It is a genuine query across coverage, capability and open audits — probably the single most useful sentence a marketplace operator can be told, and a real build rather than a set difference. The narrow version (an auditor being sole cover for a place) is built on S4.3. | Two charities book somewhere nobody covers |
| An outcome enum on complaints (TND-80) | The three named paths — the finding stands, ask the auditor for more, uphold it and re-audit at our cost — include a credit movement. Half a vocabulary is a schema nobody agreed to. S4.6 gathers the evidence in the meantime. | TND-80 is specified |
| Tracking the auditor agreement | S4.3 shows it as NOT RECORDED rather than as an unticked box, so the gap is visible where approving happens. Adding a field before TND-58 decides what the agreement says would be guessing at its shape. | TND-58 lands |
