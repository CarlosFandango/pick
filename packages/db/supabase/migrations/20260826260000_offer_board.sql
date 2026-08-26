-- ---------------------------------------------------------------------------
-- An auditor cannot read the audit behind an offer they have not accepted.
--
-- `audit_read` allows `auditor_id = auth.uid()`, which is not true until
-- acceptance. So `audit_offer join audit` returns nothing for exactly the rows
-- the offers screen exists to show, and the field app cannot render an area or
-- a date window. That is correct policy and the wrong shape for one screen.
--
-- Resolved with a security-definer function that returns only the caller's own
-- offers, and only the fields an offer is allowed to reveal. Escalation lives
-- in Postgres where `pnpm test:rls` exercises it as `authenticated`, rather
-- than in a service-role key on a device we do not control.
--
-- What is deliberately NOT returned: `site_name`, `campaign_name`, anything
-- resembling an address. The offer shows an area. An auditor who declines must
-- not come away knowing where the team will be.
-- ---------------------------------------------------------------------------

create or replace function public.offer_board()
returns table (
  offer_id                  uuid,
  audit_id                  uuid,
  audit_type                public.audit_type,
  shift_payment_method      public.shift_payment_method,
  postcode_outward          text,
  window_start_on           date,
  window_end_on             date,
  requires_av               boolean,
  base_minor_units          integer,
  travel_uplift_minor_units integer,
  expires_at                timestamptz,
  outcome                   text
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    o.id,
    a.id,
    a.audit_type,
    a.shift_payment_method,
    a.postcode_outward,
    a.window_start_on,
    a.window_end_on,
    a.requires_av,
    public.base_audit_fee_minor_units(),
    o.travel_uplift_minor_units,
    o.expires_at,
    o.outcome::text
  from public.audit_offer o
  join public.audit a on a.id = o.audit_id
  where o.auditor_id = auth.uid()
  order by o.expires_at nulls last, o.created_at desc
$$;

revoke all on function public.offer_board() from public, anon;
grant execute on function public.offer_board() to authenticated;
