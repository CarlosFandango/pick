-- ---------------------------------------------------------------------------
-- Withhold compliance_category from the API.
--
-- The rule is in CLAUDE.md and it is a measurement rule, not a privacy one: an
-- auditor who knows a question is "the vulnerability one" answers it
-- differently, and the audit stops measuring what it claims to measure. It is
-- why the category is absent from the field app's SQLite schema, and why check
-- prompts are worded not to telegraph it.
--
-- None of that was enforced anywhere an auditor could not simply walk around.
-- `check_definition_read` is `using (true)` and the grant covered every column,
-- so an auditor holding the app's own anon key could ask PostgREST for
-- `check_definition?select=code,prompt,compliance_category` and read the entire
-- mapping. The field app's schema is a convention; this is the boundary.
--
-- Note the shape of the fix. A column-level REVOKE does nothing when the
-- privilege was granted at table level — Postgres accepts it and changes
-- nothing. The table grant has to go first, then the readable columns come back
-- by name. Anything added to this table later is withheld until it is listed
-- here, which is the right default for a table with one secret in it.
--
-- Nothing needs the category outside the database today: scoring aggregates
-- over it inside `scoreAudit`, and no screen renders a per-category score. When
-- one does, it arrives as a `security definer` function gated to PICK and the
-- audit's own client — not as a widened grant.
-- ---------------------------------------------------------------------------

revoke select on public.check_definition from authenticated;

grant select (
  id,
  code,
  version,
  moment,
  prompt,
  guidance,
  weight,
  is_critical,
  sort_order,
  is_active,
  created_at
) on public.check_definition to authenticated;
