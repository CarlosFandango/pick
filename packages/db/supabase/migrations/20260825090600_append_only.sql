-- ---------------------------------------------------------------------------
-- Append-only enforcement for ObservationLog, CheckResult, CreditTransaction.
--
-- Two layers on purpose:
--   REVOKE   stops anon/authenticated at the privilege level.
--   TRIGGER  stops service_role and anything else that bypasses RLS.
-- Everything else in the schema is ordinary CRUD.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['observation_log', 'check_result', 'credit_transaction']
  loop
    execute format('revoke update, delete on public.%I from anon, authenticated', t);

    execute format(
      'create trigger %I before update or delete on public.%I
         for each statement execute function app.deny_mutation()',
      t || '_append_only', t
    );
  end loop;
end;
$$;
