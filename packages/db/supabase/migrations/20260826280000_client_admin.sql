-- ---------------------------------------------------------------------------
-- S4.5 — the clients screen.
--
-- A roster of charities with what they hold and what they have used, plus the
-- one write PICK needs: adjusting a balance. That write is an INSERT on an
-- append-only ledger, never an edit — a correction is a new row, and both a
-- reason and an actor are mandatory because an adjustment nobody can account
-- for is indistinguishable from a mistake.
-- ---------------------------------------------------------------------------

create or replace function public.client_roster()
returns table (
  organisation_id   uuid,
  name              text,
  residency_zone    public.residency_zone,
  charity_number    text,
  is_active         boolean,
  balance           integer,
  members           integer,
  audits_booked     integer,
  audits_released   integer
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    o.id,
    o.name,
    o.residency_zone,
    o.charity_number,
    o.is_active,
    coalesce((select sum(t.delta)::integer from public.credit_transaction t
              where t.organisation_id = o.id), 0),
    (select count(*)::integer from public.user_profile u where u.organisation_id = o.id),
    (select count(*)::integer from public.audit a where a.client_organisation_id = o.id),
    (select count(*)::integer from public.audit a
      where a.client_organisation_id = o.id and a.status = 'released')
  from public.organisation o
  where app.is_admin() and o.org_type = 'charity'
  order by o.name
$$;

create or replace function public.adjust_credits(
  p_organisation_id uuid,
  p_delta           integer,
  p_reason          text
)
returns public.credit_transaction
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.credit_transaction;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may adjust credits'
      using errcode = 'insufficient_privilege';
  end if;
  if p_delta = 0 then
    raise exception 'an adjustment of zero records nothing'
      using errcode = 'check_violation';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required for a credit adjustment'
      using errcode = 'check_violation';
  end if;

  -- A new row, never an edit. The ledger is evidence; the balance is the sum
  -- of what is shown, and a charity can add it up themselves.
  insert into public.credit_transaction (organisation_id, delta, reason, note, created_by)
  values (p_organisation_id, p_delta, 'adjustment', trim(p_reason), auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.client_roster() from public, anon;
revoke all on function public.adjust_credits(uuid, integer, text) from public, anon;
grant execute on function public.client_roster() to authenticated;
grant execute on function public.adjust_credits(uuid, integer, text) to authenticated;
