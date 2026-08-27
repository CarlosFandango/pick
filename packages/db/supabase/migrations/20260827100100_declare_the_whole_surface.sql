-- ---------------------------------------------------------------------------
-- Own the privileges we did not declare, and stop inheriting the rest.
--
-- 20260826090100 said it: "a schema that depends on privileges it never states
-- is one release note away from breaking." It then revoked `anon` with
-- `revoke all on all tables` — a snapshot, taken at that moment. Every table
-- created afterwards (auditor_conflict, auditor_capability, prep_progress,
-- complaint) picked the platform's default privileges straight back up, and
-- the test that should have noticed checked one table by name.
--
-- The same shape twice more:
--
--   * Postgres grants EXECUTE on a new function to PUBLIC unless told not to,
--     so `auditor_code_for` — which is the whole coded-identity promise — was
--     executable by anyone, while every other function in these migrations was
--     revoked and granted explicitly.
--   * `app.is_admin()` is the most-called expression in the policy set and the
--     only helper without a pinned search_path.
--
-- Defaults are the thing to state, not the thing to rely on. Everything below
-- covers objects that do not exist yet, so the next migration cannot reopen any
-- of this by simply adding a table.
-- ---------------------------------------------------------------------------

-- anon ----------------------------------------------------------------------
-- Every policy is `to authenticated`, so anon could never read a row. Denying
-- at the privilege level makes that a refusal rather than an empty list — and
-- an empty list is indistinguishable from a query that worked.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;

alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- functions -----------------------------------------------------------------
-- Two defaults were handing out EXECUTE that nobody wrote down: Postgres grants
-- it to PUBLIC on every new function, and the platform's default privileges
-- grant it to `authenticated` as well. Between them, every internal helper was
-- callable by every signed-in user.
--
-- PUBLIC and anon lose it wholesale — no function in this schema is meant for
-- either. `authenticated` keeps every grant a migration made deliberately, and
-- loses the seven it only ever had by inheritance. Those seven were enumerated
-- from the database rather than guessed: they are the functions holding an
-- EXECUTE that no `grant` statement anywhere in this directory asks for.
revoke execute on all functions in schema public from public, anon;

alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- The enumerated constants. Every one runs inside a `security definer`
-- function, which executes as its owner and does not consult the caller's
-- grants, so none of them needs to be reachable from outside the database.
revoke execute on function public.base_audit_fee_minor_units() from authenticated;
revoke execute on function public.booking_lead_days() from authenticated;
revoke execute on function public.default_travel_uplift_minor_units() from authenticated;
revoke execute on function public.exposure_window_days() from authenticated;
revoke execute on function public.review_gate_audits() from authenticated;
revoke execute on function public.write_up_due_hours() from authenticated;

-- And the one whose whole job is to make an auditor unidentifiable. Handing a
-- client a function that turns an auditor id into a code invites feeding it
-- ids; `audit_auditor_code` takes an audit instead and checks who is asking.
revoke execute on function public.auditor_code_for(uuid, uuid) from authenticated;

-- schema app ----------------------------------------------------------------
-- Pin search_path on every helper, not just the ones that are security
-- definer. `is_admin` is the expression every policy in the schema evaluates
-- and it resolves correctly today only because it happens to schema-qualify
-- its one call; the trigger functions run as the table owner. "Happens to" is
-- not a property worth depending on in either place, and a rule that covers
-- the whole schema is one a test can state.
create or replace function app.is_admin()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(app.current_role() = 'pick_admin', false);
$$;

create or replace function app.deny_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'relation %.% is append-only: % is not permitted',
    tg_table_schema, tg_table_name, tg_op
    using errcode = 'restrict_violation';
end;
$$;

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
