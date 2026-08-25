-- ---------------------------------------------------------------------------
-- Adopt the vocabulary from design/BUILD-GUIDE.md.
--
-- The enums here were invented before the design drop existed. Where they
-- disagree with the agreed domain language, the design wins — and the schema
-- moves rather than the application mapping around it. Two names for one
-- concept is a tax paid on every screen, query and conversation forever.
--
-- Safe to rename now: no hosted project exists and no row has ever been
-- written outside a test transaction.
-- ---------------------------------------------------------------------------

-- Pipeline: booked → assigned → in_progress → in_review → released.
alter type public.audit_status rename value 'requested'    to 'booked';
alter type public.audit_status rename value 'matched'      to 'assigned';
alter type public.audit_status rename value 'under_review' to 'in_review';
alter type public.audit_status rename value 'completed'    to 'released';

-- 'scheduled' and 'submitted' were staging posts the design does not have.
-- Postgres cannot drop an enum value, so they are simply never written; the
-- CHECK below stops them being used by accident.
--
-- No-show is a first-class outcome, not a failure: the auditor is paid in full
-- and the client's credit is returned.
alter type public.audit_status add value if not exists 'no_team_present';

-- Verdicts are PASS | FAIL | NOTE. "NOTE" is an observation the auditor wants
-- on the record without calling it a breach — the spec's benefit-of-the-doubt
-- position, and the reason observations and verdicts are separate layers.
alter type public.check_outcome add value if not exists 'note';
