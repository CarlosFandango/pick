-- ---------------------------------------------------------------------------
-- Take the auditor's id off the audit row.
--
-- S3.4 is decided: a charity may recognise an auditor across its own audits,
-- through a code that is an md5 of auditor and charity together. The point of
-- mixing the charity in is that the same auditor reads differently to a
-- different charity, so two charities comparing notes cannot work out they are
-- talking about the same person.
--
-- `audit.auditor_id` defeats that on its own. It is the same uuid everywhere,
-- so it is exactly the cross-charity handle the code was designed not to be.
-- `preferred_auditor_id` is worse: a client sets it by sending a code, so
-- reading it back turns their own code into the global id.
--
-- Nothing reads either column outside the database. The portal selected
-- auditor_id on the review screen and never used it; every rule that needs it
-- — the RLS policies, the assignment and ops functions — either evaluates
-- inside a policy or runs `security definer`, and neither consults the caller's
-- column privileges. Verified: withholding both breaks nothing in the suite.
--
-- The cost is that `audit` is now granted column by column, so a column added
-- later is unreadable until it is listed here. That is a real maintenance edge
-- and the reason surface.test.ts asserts the withheld set exactly: forget to
-- grant a new column and the build says so, by name.
-- ---------------------------------------------------------------------------

revoke select on public.audit from authenticated;

grant select (
  id,
  reference,
  client_organisation_id,
  status,
  campaign_name,
  site_name,
  address_line,
  postcode,
  postcode_outward,
  postcode_area,
  scheduled_for,
  window_minutes,
  price_pence,
  auditor_fee_pence,
  check_set_version,
  requested_at,
  matched_at,
  started_at,
  submitted_at,
  completed_at,
  cancelled_at,
  cancellation_reason,
  created_by,
  created_at,
  updated_at,
  window_start_on,
  window_end_on,
  pitch_detail,
  no_team_present_at,
  requires_review,
  released_at,
  released_by,
  audit_type,
  shift_payment_method,
  session_started_at,
  session_ended_at,
  returned_moments,
  returned_at,
  review_note,
  requires_av
) on public.audit to authenticated;
