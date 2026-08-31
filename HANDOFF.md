# Where things stand — 30 August 2026

Written for whoever opens this repo next, including a future me with no memory
of last night. Delete it once someone has read it and the four decisions below
have an answer.

## The one thing to know

`main` now carries 18 commits of design work done in one overnight session.
The three branches that were in flight — `worktree-design-pass`,
`places-not-postcodes` and `design-implementation` — are all merged and
deleted, and the `design-pass` worktree is gone. There is one branch.

```bash
git log --oneline 4ff23f5..HEAD   # what happened, and why
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
| The overnight decision log | **TND-106** in Linear. There was a rendered version as a Claude artifact; it has since gone, and everything in it is in TND-106 and the commit messages |
| Tickets raised from it | TND-106 (the work), 107 (notifications), 108 (coverage gap), 109 (the 29 sentences), 110 (`packages/ui`), 111–117 (the unbuilt screens) |
| What we need from Jaz | **TND-118 "Jaz — start here"** — five tickets, ordered, everything else explicitly ignorable |

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

## What is designed but not built

Six artboards in `design/mockups/` have no implementation, and four field
screens have the dark theme without their individual designs. Each has a
ticket written to be executed without this session's context — the design
file, what already exists, what has to hold, and what is explicitly out of
scope.

| Ticket | | Why it matters |
|---|---|---|
| TND-111 | Rework | The machinery exists and the message does not. A returned write-up waits on somebody who has not been told. **Cheapest of the six, most costly to leave.** |
| TND-112 | Arrival | One button means both "I am here" and "the audit is running", and the 45-minute no-show clock runs from it. A real bug. |
| TND-113 | Concern | A charity types into a box and never hears anything again. The PICK side was built; the charity side was not. |
| TND-114 | Accept | Nothing ever invites an auditor to declare a conflict we do not already know about. Independence is the product. |
| TND-115 | Field designs | Offers, Prep, Session, Write-up have the theme, not the design. Session is the one to read first. |
| TND-116 | History | One report says a fundraiser did wrong; four say the agency has a training problem. All the data exists; nothing reads across it. |
| TND-117 | ClientWelcome | A charity's first screen is an unstyled password box. |

## What is deliberately not built

Notifications, TND-80's three outcomes, S3.2's auditor picker, PDF export, the
coverage-gap query, agreement tracking, and every timing promise the designs
make that nothing measures. All seven are rows in FUNCTIONALITY's *Deferred*
table, with the reason and the trigger for revisiting.
