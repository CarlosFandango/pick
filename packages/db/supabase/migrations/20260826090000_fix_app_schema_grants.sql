-- ---------------------------------------------------------------------------
-- Let signed-in users actually execute the RLS helper functions.
--
-- 20260825090000 revoked everything on schema app, and 20260825090700 granted
-- EXECUTE on its functions — but EXECUTE is inert without USAGE on the schema
-- that contains them. Every policy calls app.is_admin() or app.current_org(),
-- so every RLS-protected table raised
--
--   permission denied for schema app
--
-- for `authenticated`: the API was broken for every signed-in user.
--
-- It stayed hidden because the roles that were tested all skip the policy
-- expression — postgres and service_role bypass RLS entirely, and anon matches
-- no policy (they are all `to authenticated`), so Postgres returns zero rows
-- without ever evaluating one. Only a real signed-in session hits this path.
--
-- Granting USAGE does not expose the schema over the API: PostgREST serves
-- only the schemas listed in config.toml (public, graphql_public).
-- ---------------------------------------------------------------------------

grant usage on schema app to authenticated;
grant execute on all functions in schema app to authenticated;

-- `grant ... on all functions` is a one-time snapshot, so a helper added by a
-- later migration would arrive unusable and reproduce this exact outage.
alter default privileges in schema app grant execute on functions to authenticated;
