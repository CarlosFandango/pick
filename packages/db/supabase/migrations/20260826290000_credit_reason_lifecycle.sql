-- ---------------------------------------------------------------------------
-- Credits are reserved at booking and consumed at release (TND-87).
--
-- Until now a booking wrote one `-1` and that was the whole story. Three
-- problems with that:
--
--   1. A credit spent at booking has already gone by the time we know whether
--      the audit happened. Cancellation and no-show worked only because a
--      second `+1` refund row was written to undo it.
--   2. Two bookings racing for a last remaining credit could both succeed.
--      The balance was read, then written, with nothing in between.
--   3. Credits are not fungible — a £250 single and a £187.50 bundle credit
--      are worth different amounts — and nothing recorded which one an audit
--      actually used. Revenue per audit was unknowable.
--
-- The shape: RESERVATION debits the balance and names the purchase it came
-- from. CONSUMPTION does not move the balance at all — the credit already left
-- when it was reserved — it makes the reservation permanent. RELEASE returns
-- it. So `available` is still sum(delta), and "reserved but not yet settled"
-- is a question the ledger can answer rather than a column that could drift.
--
-- Not in this migration: expiry policy. The transaction type exists and
-- nothing writes it, which is the point — expiry rules are an open decision
-- and the recommendation is soft expiry with explicit rollover.
-- ---------------------------------------------------------------------------

-- `booking` was always a reservation; it only looked like a spend because
-- nothing ever settled it.
alter type public.credit_reason rename value 'booking' to 'reservation';
alter type public.credit_reason add value if not exists 'release';
alter type public.credit_reason add value if not exists 'consumption';
