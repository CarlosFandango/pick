-- ---------------------------------------------------------------------------
-- Close the direct write path.
--
-- Every state change in this product is a `security definer` function that
-- checks the caller, the current status and the invariants in one transaction:
-- book_audit spends the credit, accept_offer withdraws the losing offers and
-- writes the pay items, release_audit refuses anything not in review.
--
-- None of that was enforced. `authenticated` held table-level INSERT, UPDATE
-- and DELETE on every table, and the policies let the obvious caller through,
-- so each of those functions had a PATCH-shaped hole beside it:
--
--   * a client could `insert into audit` and get an audit with no credit spent,
--     no three-day window and no lead time — free work, booked for tomorrow;
--   * an assigned auditor could `update audit set auditor_fee_pence = …,
--     status = 'released'` — their own pay, and past PICK's review gate;
--   * an auditor could `update audit_offer set outcome = 'accepted'`, which
--     leaves the audit unassigned with no pay items and, because of the unique
--     partial index, unacceptable by anyone else ever again.
--
-- So the rule is inverted here. `authenticated` may read what RLS allows, and
-- may write directly only where there is no invariant spanning two tables to
-- hold: a field event it minted, a complaint, its own prep progress. Everything
-- with a transaction around it is an RPC (checked, transactional, testable) or
-- the service role in a server action — which is what docs/PATTERNS.md already
-- says for invites, credit purchases, matching and payout runs.
--
-- Enforced twice, like the append-only tables: the GRANT is gone, and the
-- policy is gone with it. Re-granting the table by accident does not reopen the
-- hole, and re-adding a policy without a grant does not either.
-- ---------------------------------------------------------------------------

-- audit --------------------------------------------------------------------
-- Written by book_audit, accept_offer, submit_write_up, return_write_up,
-- release_audit, void_audit, report_no_team_present and prefer_auditor.
drop policy audit_client_insert on public.audit;
drop policy audit_update       on public.audit;
drop policy audit_admin_delete on public.audit;

revoke insert, update, delete on public.audit from authenticated;

-- audit_offer ---------------------------------------------------------------
-- Written by offer_audit, accept_offer and decline_offer.
drop policy audit_offer_respond     on public.audit_offer;
drop policy audit_offer_admin_write on public.audit_offer;

revoke insert, update, delete on public.audit_offer from authenticated;

-- audit_pay_item ------------------------------------------------------------
-- Written by accept_offer and report_no_team_present. An auditor reads their
-- own pay; nobody types it.
drop policy audit_pay_item_admin_write on public.audit_pay_item;

revoke insert, update, delete on public.audit_pay_item from authenticated;

-- identity ------------------------------------------------------------------
-- Invites and profile edits cross tenant lines, so they belong in a server
-- action on the service role where the rule is testable. That was already the
-- decision; the grants had not caught up with it.
drop policy organisation_admin_write    on public.organisation;
drop policy user_profile_admin_write    on public.user_profile;
drop policy auditor_profile_admin_write on public.auditor_profile;
drop policy auditor_coverage_admin_write on public.auditor_coverage;
drop policy auditor_conflict_admin      on public.auditor_conflict;
drop policy auditor_capability_admin    on public.auditor_capability;

revoke insert, update, delete on public.organisation       from authenticated;
revoke insert, update, delete on public.user_profile       from authenticated;
revoke insert, update, delete on public.auditor_profile    from authenticated;
revoke insert, update, delete on public.auditor_coverage   from authenticated;
revoke insert, update, delete on public.auditor_conflict   from authenticated;
revoke insert, update, delete on public.auditor_capability from authenticated;

-- the catalogue -------------------------------------------------------------
-- check_definition rows are immutable in practice: a change is a new version,
-- loaded by migration or seed. Nothing edits one through the API.
drop policy check_definition_admin_write on public.check_definition;

revoke insert, update, delete on public.check_definition from authenticated;

-- money ---------------------------------------------------------------------
-- credit_transaction keeps INSERT: the admin policy is the recorded purchase
-- path, and UPDATE/DELETE are already revoked by the append-only migration.
-- Payout runs are built by a server action on the service role, so the write
-- half of payout_run_admin goes; the read half is still how PICK sees a run.
drop policy payout_run_admin             on public.payout_run;
drop policy payout_line_item_admin_write on public.payout_line_item;

create policy payout_run_read on public.payout_run for select to authenticated
  using (app.is_admin());

revoke insert, update, delete on public.payout_run       from authenticated;
revoke insert, update, delete on public.payout_line_item from authenticated;

-- evidence ------------------------------------------------------------------
-- The owning auditor still inserts a pointer; nobody edits one afterwards.
drop policy evidence_attachment_admin_write on public.evidence_attachment;

revoke update, delete on public.evidence_attachment from authenticated;

-- complaint -----------------------------------------------------------------
-- Left alone. A charity raises one and PICK acknowledges or resolves it; that
-- is an ordinary admin edit with no invariant to hold across two tables, so it
-- has no RPC to be a hole beside. complaint_admin_write stays.

-- What remains for `authenticated`, deliberately:
--   insert  observation_log, check_result, evidence_attachment  (field sync)
--           complaint                                           (S3.6)
--           credit_transaction                                  (admin policy)
--           prep_progress                                       (S1.4)
--   update  complaint                                           (admin policy)
--           prep_progress                                       (S1.4)
--   delete  complaint                                           (admin policy)
--           prep_progress                                       (S1.4)
-- packages/db/test/privileges.test.ts states this as a table and fails if it
-- drifts.
