-- ---------------------------------------------------------------------------
-- Drop the eight-argument book_audit.
--
-- 20260826180000 "rebuilt" book_audit to carry the A/V flag and the lead-time
-- rule. `create or replace function` replaces a function with the same argument
-- list; a different one is an overload. So the rebuild did not replace anything
-- — it left the original beside it, still granted to `authenticated` from
-- 20260826110000, still knowing nothing about booking_lead_days().
--
-- A client could call it by name with the eight original arguments and book a
-- window starting tomorrow, which the design says must be impossible: a window
-- that short is effectively a date, and a fundraising team that knows the date
-- is not being observed doing what it normally does.
--
-- The migration read as if the old behaviour was gone. It was one `\df` away
-- from being visible, and nothing was looking.
-- ---------------------------------------------------------------------------

drop function public.book_audit(
  uuid,
  public.audit_type,
  public.shift_payment_method,
  text,
  date,
  date,
  text,
  text
);
