-- ---------------------------------------------------------------------------
-- Append-only enforcement for ObservationLog, CheckResult, CreditTransaction.
--
-- Two layers on purpose:
--   REVOKE   stops anon/authenticated at the privilege level.
--   TRIGGER  stops service_role and anything else that bypasses RLS.
--
-- Statement-level triggers, so they also fire on an UPDATE or DELETE that
-- matches no rows — the attempt is the thing worth refusing.
--
-- Written out per table rather than looped in a DO block: these statements are
-- the schema, and they should be greppable, diffable and individually
-- attributable in an error message.
--
-- Everything else in the schema is ordinary CRUD.
-- ---------------------------------------------------------------------------

revoke update, delete on public.observation_log    from anon, authenticated;
revoke update, delete on public.check_result       from anon, authenticated;
revoke update, delete on public.credit_transaction from anon, authenticated;

create trigger observation_log_append_only
  before update or delete on public.observation_log
  for each statement execute function app.deny_mutation();

create trigger check_result_append_only
  before update or delete on public.check_result
  for each statement execute function app.deny_mutation();

create trigger credit_transaction_append_only
  before update or delete on public.credit_transaction
  for each statement execute function app.deny_mutation();
