-- ---------------------------------------------------------------------------
-- S3.1 — booking deepened.
--
-- Three rules the thin version did not carry:
--   * A/V evidence can be required, which narrows the eligible pool.
--   * The window must start far enough ahead that matching does not give the
--     shift date away.
--   * Booking with no credits is refused (already true) and said plainly.
-- ---------------------------------------------------------------------------

-- Whether this auditor can capture A/V, and whether this audit needs it.
-- The capability is a flag, not a workflow: consent, retention and playback
-- are product decisions that have not been made, and EvidenceAttachment
-- already models the pointer without any of that machinery.
alter table public.auditor_profile
  add column av_capable boolean not null default false;

alter table public.audit
  add column requires_av boolean not null default false;

-- How far ahead a window must start. Long enough that assigning an auditor
-- cannot reveal which day the team is being watched.
create or replace function public.booking_lead_days()
returns integer language sql immutable as $$ select 5 $$;

-- Rebuilt to carry the two new rules. Everything else is unchanged.
create or replace function public.book_audit(
  p_organisation_id      uuid,
  p_audit_type           public.audit_type,
  p_shift_payment_method public.shift_payment_method,
  p_postcode             text,
  p_window_start_on      date,
  p_window_end_on        date,
  p_site_name            text default null,
  p_campaign_name        text default null,
  p_requires_av          boolean default false
)
returns public.audit
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller  uuid := auth.uid();
  v_role    public.app_role;
  v_org     uuid;
  v_balance integer;
  v_audit   public.audit;
  v_lead    integer := public.booking_lead_days();
begin
  if v_caller is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;

  select role, organisation_id into v_role, v_org
  from public.user_profile where id = v_caller;

  if v_role is distinct from 'pick_admin'
     and (v_role is distinct from 'client' or v_org is distinct from p_organisation_id) then
    raise exception 'not permitted to book for this organisation'
      using errcode = 'insufficient_privilege';
  end if;

  if p_window_end_on - p_window_start_on < 2 then
    raise exception 'the date window must cover at least three days'
      using errcode = 'check_violation';
  end if;

  if p_window_start_on < current_date + v_lead then
    raise exception 'the window must start at least % days from today', v_lead
      using errcode = 'check_violation';
  end if;

  select coalesce(sum(delta), 0) into v_balance
  from public.credit_transaction where organisation_id = p_organisation_id;

  if v_balance < 1 then
    raise exception 'no credits available' using errcode = 'check_violation';
  end if;

  insert into public.audit (
    client_organisation_id, status, audit_type, shift_payment_method,
    postcode, window_start_on, window_end_on, site_name, campaign_name,
    requires_av, created_by, requested_at
  ) values (
    p_organisation_id, 'booked', p_audit_type, p_shift_payment_method,
    p_postcode, p_window_start_on, p_window_end_on, p_site_name, p_campaign_name,
    p_requires_av, v_caller, now()
  ) returning * into v_audit;

  insert into public.credit_transaction (
    organisation_id, delta, reason, audit_id, unit_price_pence, created_by
  ) values (
    p_organisation_id, -1, 'booking', v_audit.id, 17500, v_caller
  );

  return v_audit;
end;
$$;

-- Eligibility gains a seventh condition when A/V is required.
create or replace function public.eligible_auditors(p_audit_id uuid)
returns table (
  auditor_id   uuid,
  match_reason text,
  warnings     public.eligibility_flag[]
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with allowed as (select app.is_admin() as ok),
  target as (
    select id, client_organisation_id, postcode_area, audit_type,
           window_start_on, window_end_on, requires_av
    from public.audit where id = p_audit_id
  ),
  history as (
    select a.auditor_id, max(a.window_end_on) as last_seen
    from public.audit a, target t
    where a.client_organisation_id = t.client_organisation_id
      and a.auditor_id is not null and a.id <> t.id
    group by a.auditor_id
  )
  select
    ap.user_id,
    format('covers %s, approved, capable of %s%s', t.postcode_area, t.audit_type,
           case when t.requires_av then ', A/V equipped' else '' end),
    case when h.last_seen is not null
         then array['familiarity']::public.eligibility_flag[]
         else '{}'::public.eligibility_flag[] end
  from public.auditor_profile ap
  cross join target t
  cross join allowed
  left join history h on h.auditor_id = ap.user_id
  where
    allowed.ok
    and ap.approval_status = 'approved'
    -- A/V, when the client asked for it. A smaller pool, and they were told so.
    and (not t.requires_av or ap.av_capable)
    and exists (
      select 1 from public.auditor_coverage c
      where c.auditor_id = ap.user_id and c.postcode_area = t.postcode_area
    )
    and exists (
      select 1 from public.auditor_capability k
      where k.auditor_id = ap.user_id and k.audit_type = t.audit_type
    )
    and not exists (
      select 1 from public.auditor_conflict f
      where f.auditor_id = ap.user_id and f.organisation_id = t.client_organisation_id
    )
    and (h.last_seen is null or h.last_seen < current_date - public.exposure_window_days())
    and not exists (
      select 1 from public.audit busy
      where busy.auditor_id = ap.user_id and busy.id <> t.id
        and busy.status in ('assigned', 'in_progress')
        and busy.window_start_on <= t.window_end_on
        and busy.window_end_on   >= t.window_start_on
    )
    and not exists (
      select 1 from public.audit_offer o
      where o.audit_id = t.id and o.auditor_id = ap.user_id
        and o.outcome in ('offered', 'accepted')
    );
$$;

revoke all on function public.book_audit(uuid, public.audit_type, public.shift_payment_method, text, date, date, text, text, boolean) from public, anon;
grant execute on function public.book_audit(uuid, public.audit_type, public.shift_payment_method, text, date, date, text, text, boolean) to authenticated;
