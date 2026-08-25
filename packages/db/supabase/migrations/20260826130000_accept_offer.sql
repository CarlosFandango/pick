-- ---------------------------------------------------------------------------
-- Slice 3/4 — S1.3 Job offer, S2.2 Accept.
--
-- The offer shows area, not address: the exact pitch is withheld until the
-- audit is accepted, so it cannot leak to auditors who never take the job.
--
-- Total pay is shown in full BEFORE accepting and never changes after. Travel
-- uplift lives on the offer rather than the audit because it depends on who
-- is travelling, not on where the shift is.
-- ---------------------------------------------------------------------------

-- A flat placeholder until there is distance data to compute from. One
-- enumerated constant beats a configuration table nobody has requirements for.
create or replace function public.default_travel_uplift_pence()
returns integer language sql immutable as $$ select 1500 $$;

create or replace function public.base_audit_fee_pence()
returns integer language sql immutable as $$ select 10000 $$;

alter table public.audit_offer
  add column travel_uplift_pence integer not null default public.default_travel_uplift_pence(),
  add constraint travel_uplift_not_negative check (travel_uplift_pence >= 0);

-- ---------------------------------------------------------------------------
-- Accepting is the moment an audit becomes somebody's job.
--
-- One transaction: the offer closes, every other open offer is withdrawn, the
-- audit is assigned, and the pay the auditor was shown is written down as
-- line items. Pay is recorded at acceptance precisely so it cannot drift from
-- what they agreed to.
-- ---------------------------------------------------------------------------
create or replace function public.accept_offer(p_offer_id uuid)
returns public.audit
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_offer  public.audit_offer;
  v_audit  public.audit;
  v_base   integer := public.base_audit_fee_pence();
begin
  select * into v_offer from public.audit_offer where id = p_offer_id for update;

  if v_offer.id is null then
    raise exception 'no such offer' using errcode = 'no_data_found';
  end if;
  if v_offer.auditor_id is distinct from auth.uid() then
    raise exception 'this offer is not yours' using errcode = 'insufficient_privilege';
  end if;
  if v_offer.outcome <> 'offered' then
    raise exception 'this offer is already %', v_offer.outcome using errcode = 'check_violation';
  end if;
  if v_offer.expires_at is not null and v_offer.expires_at < now() then
    raise exception 'this offer has expired' using errcode = 'check_violation';
  end if;

  -- Lock the audit before checking: two auditors accepting at the same instant
  -- must not both win.
  select * into v_audit from public.audit where id = v_offer.audit_id for update;
  if v_audit.status <> 'booked' then
    raise exception 'this audit is no longer available' using errcode = 'check_violation';
  end if;

  update public.audit_offer
     set outcome = 'accepted', responded_at = now()
   where id = p_offer_id;

  -- Everyone else finds out it is gone, rather than accepting into a wall.
  update public.audit_offer
     set outcome = 'withdrawn', responded_at = now()
   where audit_id = v_offer.audit_id and id <> p_offer_id and outcome = 'offered';

  update public.audit
     set auditor_id = v_offer.auditor_id,
         status = 'assigned',
         matched_at = now(),
         auditor_fee_pence = v_base + v_offer.travel_uplift_pence
   where id = v_offer.audit_id
  returning * into v_audit;

  -- Itemised, always: an auditor should be able to see what each part is for.
  insert into public.audit_pay_item (audit_id, kind, amount_pence, note)
  values (v_audit.id, 'base', v_base, 'Audit fee');

  if v_offer.travel_uplift_pence > 0 then
    insert into public.audit_pay_item (audit_id, kind, amount_pence, note)
    values (v_audit.id, 'travel', v_offer.travel_uplift_pence, 'Travel uplift');
  end if;

  return v_audit;
end;
$$;

create or replace function public.decline_offer(p_offer_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_offer public.audit_offer;
begin
  select * into v_offer from public.audit_offer where id = p_offer_id for update;

  if v_offer.id is null then
    raise exception 'no such offer' using errcode = 'no_data_found';
  end if;
  if v_offer.auditor_id is distinct from auth.uid() then
    raise exception 'this offer is not yours' using errcode = 'insufficient_privilege';
  end if;
  if v_offer.outcome <> 'offered' then
    raise exception 'this offer is already %', v_offer.outcome using errcode = 'check_violation';
  end if;

  update public.audit_offer
     set outcome = 'declined', responded_at = now(), decline_reason = p_reason
   where id = p_offer_id;
end;
$$;

revoke all on function public.accept_offer(uuid) from public, anon;
revoke all on function public.decline_offer(uuid, text) from public, anon;
grant execute on function public.accept_offer(uuid) to authenticated;
grant execute on function public.decline_offer(uuid, text) to authenticated;
