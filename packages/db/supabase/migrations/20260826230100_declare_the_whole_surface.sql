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
-- Take the whole function surface back and hand it out again by name.
--
-- Two separate defaults were feeding it: Postgres grants EXECUTE on a new
-- function to PUBLIC, and the platform's default privileges were granting it
-- to `authenticated` as well. Between them, every internal helper was callable
-- by every signed-in user — the enumerated constants, and `auditor_code_for`,
-- which exists to make an auditor unidentifiable. None of them is called from
-- outside the database: they run inside `security definer` functions, which
-- execute as the owner and do not consult the caller's grants at all.
revoke execute on all functions in schema public from public, anon, authenticated;

alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- The callable surface, stated once. A new RPC is not reachable until it
-- appears here, which is the intended cost: forgetting the grant now fails
-- loudly for its caller instead of quietly working for everyone.
grant execute on function public.book_audit(uuid, public.audit_type, public.shift_payment_method, text, date, date, text, text, boolean) to authenticated;
grant execute on function public.eligible_auditors(uuid) to authenticated;
grant execute on function public.offer_audit(uuid, interval) to authenticated;
grant execute on function public.assignment_console(uuid) to authenticated;
grant execute on function public.selectable_auditors(uuid, text, public.audit_type, boolean) to authenticated;
grant execute on function public.prefer_auditor(uuid, text) to authenticated;
grant execute on function public.accept_offer(uuid) to authenticated;
grant execute on function public.decline_offer(uuid, text) to authenticated;
grant execute on function public.submit_write_up(uuid, jsonb) to authenticated;
grant execute on function public.return_write_up(uuid, public.audit_moment[], text) to authenticated;
grant execute on function public.review_gate_reason(uuid) to authenticated;
grant execute on function public.release_audit(uuid) to authenticated;
grant execute on function public.void_audit(uuid, text) to authenticated;
grant execute on function public.report_no_team_present(uuid, text) to authenticated;
grant execute on function public.ops_queue() to authenticated;
grant execute on function public.ops_counters() to authenticated;

-- Not an RPC, and not an oversight: uuid_generate_v7 is a column default on
-- nearly every table, and a column default is evaluated as the role doing the
-- INSERT. Without this, inserting a complaint or a field event fails.
grant execute on function public.uuid_generate_v7() to authenticated;

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
