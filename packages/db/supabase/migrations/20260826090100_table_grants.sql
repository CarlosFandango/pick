-- ---------------------------------------------------------------------------
-- Own the table privileges instead of inheriting them.
--
-- The schema had no GRANTs of its own: it worked only because a Supabase stack
-- bootstraps `alter default privileges ... grant all on tables to anon,
-- authenticated, service_role`. That is the platform's default, not ours, and
-- it differs between CLI versions — a newer CLI in CI produced
--
--   permission denied for table check_definition
--
-- against the identical migrations that passed locally. A schema that depends
-- on privileges it never states is one release note away from breaking.
--
-- RLS decides WHICH ROWS a caller sees. GRANT decides whether it may touch the
-- table at all. Both are needed; neither substitutes for the other.
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- `on all tables` is a snapshot, so a table added later would arrive
-- unreachable. This covers the ones we have not written yet.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

-- The blanket grant above re-granted UPDATE and DELETE on the append-only
-- tables. Take them back: 20260825090600 revoked them deliberately, and the
-- statement trigger should be the second line of defence, not the only one.
revoke update, delete on public.observation_log    from anon, authenticated;
revoke update, delete on public.check_result       from anon, authenticated;
revoke update, delete on public.credit_transaction from anon, authenticated;

-- `anon` is granted nothing at all. Every policy is `to authenticated`, so an
-- anonymous caller could never read a row anyway; denying at the privilege
-- level says so plainly and fails loudly rather than returning an empty list.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
