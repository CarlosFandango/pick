# Pitfalls that have already bitten

Recorded because each was expensive to find, and each will happen again unless
something checks for it. Format: symptom, why it hid, what catches it now.

## A privilege that exists but cannot be used
**Symptom:** `permission denied for schema app` on every RLS-protected table,
for every signed-in user — the whole API dead.
**Why it hid:** EXECUTE on a function is inert without USAGE on its schema, and
nothing warns you. Every check I ran used a role that never evaluates a policy:
`postgres` and `service_role` bypass RLS, `anon` matches no policy at all. A
`curl` returning `[]` looked like proof RLS worked; it was proof nothing ran.
**Caught now by:** `pnpm test:rls`, which impersonates `authenticated`.

## A schema that inherits privileges it never declares
**Symptom:** identical migrations, `permission denied for table
check_definition` in CI, green locally.
**Why it hid:** a Supabase stack bootstraps `alter default privileges ... grant
all on tables`, so the schema worked without ever granting anything. A newer CLI
in CI bootstraps differently. Anything you did not declare can change under you.
**Caught now by:** grant assertions in the RLS suite, and CI running the whole
database job on a clean stack with the latest CLI.

*Both are the same lesson: **a permission model must be stated and exercised as
the role that actually uses it.** Two shapes, one week apart.*

## Tests that assert absolute counts against a shared database
**Symptom:** integration tests pass alone and fail after a UX run —
`expected 2 to be 1`, or "the first complaint" turning out to be someone
else's.
**Why it hid:** the RLS suite runs each test in a rolled-back transaction, so
it *looks* isolated. It is not isolated from rows that were already there: the
Playwright suite books real audits, spends real credits and raises real
complaints against the same local database. Anything asserting a total, or
"the first row", is really asserting "nobody has used this app".
**Caught now by:** asserting membership of a record the test created, never a
count or a position. Three tests needed this fix before it was recognised as
one pattern rather than three coincidences.

## UX tests that consume a finite fixture
**Symptom:** the Playwright suite passes, then fails a few runs later on what
looks like a broken booking screen.
**Why it hid:** each booking spends a credit and the seeded charity starts
with four. The failure surfaces far from its cause — an exhausted fixture
looks exactly like a broken form.
**Caught now by:** a global setup that tops the ledger up to a floor before
the run. It appends rather than sets, because the ledger is append-only and
there is no row to overwrite.

## A fill token used where its text pair belongs
**Symptom:** the pipeline rail on `/audits/:id` was unreadable — upcoming steps
at 1.16:1 against the page, the current step's marker at 1.75:1. Not "slightly
low": invisible on a dim monitor.
**Why it hid:** every colour came from `design/tokens/tokens.ts`, so it looked
correct by the rule that matters most here ("no colour that is not a token").
But the brand ships accents in pairs — `auditing` is signage, `auditingText` is
the same accent as type — and a token name does not say which it is. Contrast
also degrades quietly: nothing errors, nothing logs, and it reads fine on the
laptop it was built on.
**Caught now by:** `packages/tokens/test/brand.test.ts`, which classifies every
brand colour as text / surface / hairline / fill and fails if a new token
arrives unclassified. Fills are asserted to *fail* as text, so the pairing is a
test rather than a paragraph in the build guide.

## A stale dev server that reads as a broken app
**Symptom:** the Playwright suite dies after two minutes on `Timed out waiting
120000ms from config.webServer`, having run nothing. Twice.
**Why it hid:** the config reused an existing server on port 3000, and a
long-running `pnpm dev` goes stale — after a `db:reset` or a rename it keeps
serving routes it compiled earlier and answers 404 on `/sign-in`. Playwright's
readiness check then never passes, but the error names the *web server config*,
not the stale process, so the obvious reading is that the app is broken. Both
times the fix was `kill` on a PID, after minutes of looking at the wrong thing.
**Caught now by:** the suite runs its own server on its own port (3100) and
never reuses one. One cold start per run, and the collision cannot happen.

## `create or replace function` with a changed signature makes a second function
**Symptom:** `function book_audit(unknown, unknown, ...) is not unique`, on a
call that had worked for weeks from the portal.
**Why it hid:** adding `p_requires_av` to `book_audit` looked like a rewrite —
same name, `create or replace`, migration applied cleanly. Postgres identifies
a function by name *and* argument types, so it created an overload and left the
old one in place. The portal always passed the new argument, so it always
resolved unambiguously and nothing failed. The stale version sat there for a
fortnight, and any call omitting the last argument would have run the OLD body
— writing the old ledger row and bypassing every rule added since.
**Caught now by:** `drop function` with the explicit old signature in the
migration that changes one. When a function's parameters change, the old
signature has to be named and dropped — replacing it is not what happened.

## A `security definer` function granted to `authenticated` is granted to everybody
**Symptom:** an auditor who gets zero rows for another charity's audit through
RLS could call `matching_review_gates()` on that same audit id and receive
`"First audit for this charity."`, `"Auditor's first 3 audits are reviewed.
This is number 1."` and `"2 open risk(s) recorded against this assignment."`
— another organisation's trading history, another auditor's track record, and
risk data. `audit_gate_state()` and `review_gate_reason()` leaked the same way.

**Why it hid:** three separate things each looked like the check:

- The tables were correctly locked down. `review_gate` is admin-only, and RLS
  covers `audit` and `risk`. But `security definer` runs as the owner, so none
  of that applies *inside* the function.
- The functions carried `revoke all ... from public, anon`, which **reads like
  a permission check and is not one**. It removes the roles nobody was worried
  about and leaves the one that matters.
- `authenticated` is a single role shared by every signed-in user — auditor,
  client, admin alike. Granting EXECUTE to it grants it to everyone with a
  login. There is no "signed in, therefore entitled" in this schema; entitlement
  is `app.is_admin()` or a match on `auth.uid()`.

A fourth thing hid it further: the function's tests called it through
`arrange`, which resets to `postgres`. They passed *because* there was no
guard, and adding one broke seven of them — which is how the guard proved it
worked.

**Caught now by:** `packages/db/test/gate-function-access.test.ts`, which asks
as an auditor and as a client for an audit belonging to someone else. Any new
`security definer` function needs the same pair of tests.

**Sweep for the rest of them:**

```sql
select p.proname,
       case when pg_get_functiondef(p.oid) ilike '%is_admin%'   then 'guarded'
            when pg_get_functiondef(p.oid) ilike '%auth.uid()%' then 'scoped-to-caller'
            else 'NO GUARD' end as guard
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by 2, 1;
```

Every row must read `guarded` or `scoped-to-caller`. When this was first run,
29 of 32 did and these three did not. **A function that takes an id and does
not check the caller against it is the shape to look for** — an id parameter is
an invitation to pass someone else's.

## Green typecheck, broken build
**Symptom:** `tsc` clean; `next build` fails on `Can't resolve './primitives.js'`,
then on `Cannot read properties of null (reading 'useRef')`.
**Why it hid:** `tsc` resolves `./x.js` to `x.ts` and bundlers do not; and two
copies of React in one tree only misbehave at prerender. Neither is visible to
lint, typecheck or unit tests.
**Caught now by:** `pnpm build` in CI.

## Staging silently 13 migrations behind, with all three secrets set
**Symptom:** `deploy-staging.yml` red on every push since 26 Aug, each run dying
in ~10s. `gh secret list` showed all three secrets present, so the guard passed
and the register said staging was current. It was not — it was last pushed by
hand at migration 26, with 13 landed since.

**Why it hid:** three things stacked.

- The failure text was `Invalid access token format. Must be like sbp_0102...1920`
  — emitted by `supabase link`, four steps after the guard, naming no secret and
  no repository. `SUPABASE_ACCESS_TOKEN` held something that was not a personal
  access token.
- The guard checked **presence, not shape**. Present-but-wrong sailed through a
  check written for not-yet-configured.
- Nothing depends on this workflow. A red deploy blocks no PR and fails no
  check, so its only reader is someone who goes looking — and the reason to go
  looking is the suspicion it is broken.

The guard's own comment says *a workflow that is always red teaches people to
ignore red*. That is exactly what happened, by a route the comment did not
anticipate: not a missing secret, a malformed one.

**Caught now by:** the guard validating the `sbp_` prefix and failing with a
message that names the secret and the command to fix it. Absent still skips with
a notice; malformed is a hard error.

**The general shape:** a credential check that tests for a non-empty string is
half a check. Secrets have formats — assert the format, and say which secret and
how to fix it, because the error surfacing four steps later will not.

**Worth asking of any deploy workflow nobody watches:** what tells us it failed?
If the answer is "someone notices", it will be days.

## An RLS test that cannot fail
**Symptom:** `expectRefused("update auditor_profile set approval_status = 'approved' …")`
failed with *expected the statement to be refused, but it succeeded* — which
read, for a moment, like an auditor being able to approve themselves.

**Why it hid:** it was the test that was wrong, and wrong in the direction that
looks safe. **RLS filters an UPDATE; it does not raise on one.** A statement
matching no visible row reports `UPDATE 0` and succeeds. So:

- asserting a *refusal* on an UPDATE or DELETE tests nothing about the policy —
  it passes only when something unrelated throws
- and it would keep passing if the policy were dropped, because dropping it
  changes a silent no-op into a silent write

Assert the **value did not move**, read back as `postgres`:

```ts
await db.as(attacker).query("update … set approval_status = 'approved' …");
const [row] = await db.arrange('select approval_status from …');
expect(row?.approval_status).toBe('pending');
```

`expectRefused` is right for a `security definer` function that raises, and for
an INSERT violating a `WITH CHECK`. It is wrong for UPDATE and DELETE.

**Caught now by:** `packages/db/test/onboarding.test.ts`, which reads the value
back rather than trusting the statement to complain.

## A test helper that silently discarded the arrangement
**Symptom:** assertions after an `expectRefused` read `undefined` from rows the
test had definitely just inserted.

**Why it hid:** `withDatabase` took `savepoint clean` once, before the test body
ran, and `expectRefused` rolled back to it. So a refusal undid **everything the
test had arranged**, not just the statement that was refused — and the failure
surfaced as a confusing empty read several lines later, never as "your setup is
gone".

**Caught now by:** the savepoint being re-taken immediately before each attempt,
so the rollback undoes exactly one statement. Worth remembering whenever a
helper both mutates and recovers transaction state: the recovery point has to be
as narrow as the thing being recovered from.
