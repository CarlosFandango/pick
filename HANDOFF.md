# Where things stand — 30 August 2026

Written for whoever opens this repo next, including a future me with no memory
of last night. Delete it once the branch is merged.

## The one thing to know

`design-implementation` is 16 commits of design work, **unmerged and unpushed**.
It contains the two branches that were already waiting (`worktree-design-pass`
and `places-not-postcodes`), so it is everything.

```bash
git log --oneline main..design-implementation   # what happened, and why
```

The commit messages are the real record. Each one says what changed, what it
cost, and what I decided without being able to ask. Read them before reading
anything else about this branch.

## Four decisions that were taken alone and want a second opinion

Ranked by what it costs to change your mind.

1. **The field app is now dark** (`apps/field/src/surface.ts`). Nine screens.
   An auditor running a mystery shop should not be holding a bright screen; the
   counter-argument is daylight and it was not tested.
2. **58 sentences of client-facing copy** live in `check_definition`
   (`20260830040000_checks_carry_client_prose.sql`). A charity reads these.
   Several assert regulatory consequences. **TND-109 gates this.**
3. **The report's weighted percentage is now a footnote**, not the headline.
   The case for removing it entirely was not mine to make.
4. **A read receipt on released reports** — new column plus a security-definer
   function. Verification is in `packages/db/test/report-read.test.ts`.

## Where the rest of the context is

| What | Where |
|---|---|
| Why each screen looks like this | the commit messages, then `design/mockups/` |
| The designs themselves | `design/mockups/*.dc.html` — open in a browser |
| What exists and what does not | `docs/FUNCTIONALITY.md`, including a *Deferred* table with reasons |
| How we do X | `docs/PATTERNS.md` |
| Why something is behaving impossibly | `docs/PITFALLS.md` |
| Why a decision was taken | `docs/DECISIONS.md` |
| The overnight decision log | https://claude.ai/code/artifact/016f40e1-bee3-4664-bd5a-ffad80110581 |
| Tickets raised from it | TND-106 (the work), 107 (notifications), 108 (coverage gap), 109 (copy review), 110 (`packages/ui`) |

## Running it

```bash
pnpm db:start && pnpm db:reset && pnpm dev
```

Sign in as `client@example.test`, `admin@example.test` or `auditor@example.test`,
password `picksel-dev`. The seed reaches every screen — ten audits across eight
statuses, a ledger that reconciles, observations on the audits that were worked.

```bash
node scripts/snapshot/capture.mjs out label   # all 29 pages
node scripts/snapshot/one.mjs /audits client out.jpg
node scripts/snapshot/one-field.mjs /offers out.jpg
node scripts/snapshot/invite-flow.mjs out.jpg submit   # the whole invite → onboard flow
```

That last one exists because the invitation form was broken for a week and
every layer's tests passed. See PITFALLS.

## What is deliberately not built

Notifications, TND-80's three outcomes, S3.2's auditor picker, PDF export, the
coverage-gap query, agreement tracking, and every timing promise the designs
make that nothing measures. All seven are rows in FUNCTIONALITY's *Deferred*
table, with the reason and the trigger for revisiting.
