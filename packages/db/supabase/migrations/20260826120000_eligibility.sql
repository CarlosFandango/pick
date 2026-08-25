-- ---------------------------------------------------------------------------
-- Slice 2 — S1.2 Assignment.
--
-- Eligibility is the intersection of six sets:
--   REACHABLE ∧ APPROVED ∧ CAPABLE ∧ AVAILABLE ∧ EXPOSURE-ok ∧ NO-CONFLICT
--
-- Conflict is a hard block with no override. Familiarity is a warning that
-- still proceeds. The distinction matters: a conflicted auditor invalidates
-- the audit, a familiar one merely risks being recognised.
--
-- Written as one readable query, not a rules engine. Six conditions that fit
-- on a screen do not need a framework, and the moment they stop fitting is
-- the moment to reconsider — not before.
-- ---------------------------------------------------------------------------

-- A declared reason an auditor must never see a given charity's work.
create table public.auditor_conflict (
  id              uuid primary key default public.uuid_generate_v7(),
  auditor_id      uuid not null references public.auditor_profile (user_id) on delete cascade,
  organisation_id uuid not null references public.organisation (id) on delete cascade,
  reason          text not null,
  declared_at     timestamptz not null default now(),
  unique (auditor_id, organisation_id)
);

create index auditor_conflict_org_idx on public.auditor_conflict (organisation_id);

-- Which methodologies an auditor is signed off for. Street and door-to-door
-- are different skills; lottery has its own regulations.
create table public.auditor_capability (
  auditor_id uuid not null references public.auditor_profile (user_id) on delete cascade,
  audit_type public.audit_type not null,
  primary key (auditor_id, audit_type)
);

alter table public.auditor_conflict   enable row level security;
alter table public.auditor_capability enable row level security;

create policy auditor_conflict_read on public.auditor_conflict for select to authenticated
  using (app.is_admin() or auditor_id = auth.uid());
create policy auditor_conflict_admin on public.auditor_conflict for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

create policy auditor_capability_read on public.auditor_capability for select to authenticated
  using (app.is_admin() or auditor_id = auth.uid());
create policy auditor_capability_admin on public.auditor_capability for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- How long an auditor must stay away from a charity they have already audited.
-- One enumerated constant, not a per-client configuration table: when a client
-- genuinely needs a different number, that is the moment to add the column.
create or replace function public.exposure_window_days()
returns integer language sql immutable as $$ select 90 $$;

-- ---------------------------------------------------------------------------
-- Who could take this audit, and why.
--
-- Returns one row per eligible auditor with the reason they matched and any
-- non-blocking warnings. Ineligible auditors are absent rather than returned
-- with a rejection: a marketplace should not carry a list of people it will
-- not use, and the reason a conflicted auditor was excluded is the conflict
-- record itself.
-- ---------------------------------------------------------------------------
-- security definer, so it must police its own caller: this reads across every
-- auditor in the network and must not be a directory for anyone who signs in.
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
  with allowed as (
    select app.is_admin() as ok
  ),
  target as (
    select id, client_organisation_id, postcode_area, audit_type,
           window_start_on, window_end_on
    from public.audit where id = p_audit_id
  ),
  history as (
    select a.auditor_id, max(a.window_end_on) as last_seen
    from public.audit a, target t
    where a.client_organisation_id = t.client_organisation_id
      and a.auditor_id is not null
      and a.id <> t.id
    group by a.auditor_id
  )
  select
    ap.user_id,
    format(
      'covers %s, approved, capable of %s',
      t.postcode_area, t.audit_type
    ),
    case
      when h.last_seen is not null then array['familiarity']::public.eligibility_flag[]
      else '{}'::public.eligibility_flag[]
    end
  from public.auditor_profile ap
  cross join target t
  cross join allowed
  left join history h on h.auditor_id = ap.user_id
  where
    allowed.ok
    -- APPROVED
    and ap.approval_status = 'approved'
    -- REACHABLE: covers the audit's postcode area
    and exists (
      select 1 from public.auditor_coverage c
      where c.auditor_id = ap.user_id and c.postcode_area = t.postcode_area
    )
    -- CAPABLE: signed off for this methodology
    and exists (
      select 1 from public.auditor_capability k
      where k.auditor_id = ap.user_id and k.audit_type = t.audit_type
    )
    -- NO-CONFLICT: hard block, never overridden
    and not exists (
      select 1 from public.auditor_conflict f
      where f.auditor_id = ap.user_id and f.organisation_id = t.client_organisation_id
    )
    -- EXPOSURE-ok: not seen by this charity too recently
    and (
      h.last_seen is null
      or h.last_seen < current_date - public.exposure_window_days()
    )
    -- AVAILABLE: not already committed to an audit overlapping this window
    and not exists (
      select 1 from public.audit busy
      where busy.auditor_id = ap.user_id
        and busy.id <> t.id
        and busy.status in ('assigned', 'in_progress')
        and busy.window_start_on <= t.window_end_on
        and busy.window_end_on   >= t.window_start_on
    )
    -- and not already holding an open or accepted offer for this audit
    and not exists (
      select 1 from public.audit_offer o
      where o.audit_id = t.id and o.auditor_id = ap.user_id
        and o.outcome in ('offered', 'accepted')
    );
$$;

comment on function public.eligible_auditors is
  'S1.2 — the six eligibility sets, as one query. Returns match reason and warnings.';

-- ---------------------------------------------------------------------------
-- Offer a booked audit to everyone eligible.
--
-- Offer-based availability: the audit goes to all eligible auditors and the
-- first to accept takes it. No ranking, because we have no evidence yet for
-- what a good ranking would be — and a bad one is worse than none.
-- ---------------------------------------------------------------------------
create or replace function public.offer_audit(p_audit_id uuid, p_expires_in interval default interval '24 hours')
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status public.audit_status;
  v_count  integer;
begin
  -- Offering work is PICK's job. Without this an auditor could hand
  -- themselves any booked audit in the network.
  if not app.is_admin() then
    raise exception 'only PICK admin may offer an audit'
      using errcode = 'insufficient_privilege';
  end if;

  select status into v_status from public.audit where id = p_audit_id;
  if v_status is null then
    raise exception 'no such audit' using errcode = 'no_data_found';
  end if;
  if v_status <> 'booked' then
    raise exception 'only a booked audit can be offered (this one is %)', v_status
      using errcode = 'check_violation';
  end if;

  insert into public.audit_offer (audit_id, auditor_id, match_reason, warnings, expires_at)
  select p_audit_id, e.auditor_id, e.match_reason, e.warnings, now() + p_expires_in
  from public.eligible_auditors(p_audit_id) e;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.eligible_auditors(uuid) from public, anon;
revoke all on function public.offer_audit(uuid, interval) from public, anon;
grant execute on function public.eligible_auditors(uuid) to authenticated;
grant execute on function public.offer_audit(uuid, interval) to authenticated;
