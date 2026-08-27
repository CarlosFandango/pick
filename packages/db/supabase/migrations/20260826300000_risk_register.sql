-- ---------------------------------------------------------------------------
-- The risk register (TND-82).
--
-- Not bookkeeping. The value is that PICK identified a risk **and advised the
-- client about it**. If a finding is later disputed or a regulator asks, the
-- defensible position is: we flagged that this auditor was becoming
-- recognisable at this agency, we advised you, you chose to proceed. Without
-- the record the same facts read as PICK quietly supplying degraded audits.
--
-- Same logic as the product itself — independence is only worth anything if it
-- is evidenced.
--
-- The advisory is a separate record with its own timestamp and owner, because
-- a flag nobody acted on is not evidence of anything.
-- ---------------------------------------------------------------------------

create type public.risk_type as enum ('exposure', 'conflict', 'quality', 'data_protection');
create type public.risk_severity as enum ('low', 'medium', 'high');
create type public.risk_subject as enum ('audit', 'auditor', 'client', 'assignment');
create type public.risk_status as enum ('open', 'advised', 'accepted', 'withdrawn', 'resolved');
create type public.risk_source as enum ('system', 'user');
create type public.client_response as enum ('proceeded', 'withdrew', 'no_response');

create table public.risk (
  id           uuid primary key default public.uuid_generate_v7(),
  type         public.risk_type not null,
  severity     public.risk_severity not null default 'medium',
  subject_type public.risk_subject not null,
  subject_id   uuid not null,
  -- Denormalised so the register can be filtered by charity without knowing
  -- what kind of subject each row points at.
  organisation_id uuid references public.organisation (id) on delete restrict,
  status       public.risk_status not null default 'open',
  raised_by    public.risk_source not null default 'system',
  raised_by_id uuid references public.user_profile (id),
  raised_at    timestamptz not null default now(),
  detail       text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint risk_detail_not_empty check (length(trim(detail)) > 0),
  constraint risk_user_raised_has_actor
    check (raised_by <> 'user' or raised_by_id is not null)
);

create index risk_subject_idx on public.risk (subject_type, subject_id);
create index risk_open_idx on public.risk (status) where status in ('open', 'advised');
create index risk_org_idx on public.risk (organisation_id, status);

create trigger risk_touch before update on public.risk
  for each row execute function app.touch_updated_at();

create table public.risk_advisory (
  id              uuid primary key default public.uuid_generate_v7(),
  risk_id         uuid not null references public.risk (id) on delete cascade,
  advised_at      timestamptz not null default now(),
  advised_by      uuid not null references public.user_profile (id),
  channel         text not null default 'email',
  content         text not null,
  client_response public.client_response,
  responded_at    timestamptz,
  created_at      timestamptz not null default now(),

  constraint advisory_content_not_empty check (length(trim(content)) > 0)
);

create index risk_advisory_risk_idx on public.risk_advisory (risk_id, advised_at);

-- ---------------------------------------------------------------------------
-- Overrides are themselves a signal.
--
-- A client repeatedly overriding toward the same auditor is exactly the
-- reciprocity pattern the conflict-of-interest policy exists to catch, so the
-- override is recorded whether or not it raised a risk.
-- ---------------------------------------------------------------------------
create table public.assignment_override (
  id                    uuid primary key default public.uuid_generate_v7(),
  audit_id              uuid not null references public.audit (id) on delete cascade,
  chosen_auditor_id     uuid not null references public.auditor_profile (user_id) on delete restrict,
  -- Who the system would have assigned, where that is known at the time.
  system_auditor_id     uuid references public.auditor_profile (user_id) on delete restrict,
  overridden_by         uuid not null references public.user_profile (id),
  reason                text,
  risk_id               uuid references public.risk (id),
  created_at            timestamptz not null default now()
);

create index assignment_override_audit_idx on public.assignment_override (audit_id);
create index assignment_override_auditor_idx on public.assignment_override (chosen_auditor_id, created_at);

-- ---------------------------------------------------------------------------
-- Only PICK reads or writes the register. A charity being advised of a risk
-- hears it from a person, not from a table they can browse.
-- ---------------------------------------------------------------------------
alter table public.risk enable row level security;
alter table public.risk_advisory enable row level security;
alter table public.assignment_override enable row level security;

grant select, insert, update, delete on public.risk to authenticated;
grant select, insert, update, delete on public.risk_advisory to authenticated;
grant select, insert, update, delete on public.assignment_override to authenticated;

create policy risk_admin on public.risk
  for all to authenticated using (app.is_admin()) with check (app.is_admin());
create policy risk_advisory_admin on public.risk_advisory
  for all to authenticated using (app.is_admin()) with check (app.is_admin());
create policy assignment_override_admin on public.assignment_override
  for all to authenticated using (app.is_admin()) with check (app.is_admin());

-- ---------------------------------------------------------------------------
-- Raise a risk. Called by the system on an exposure override, and by a PICK
-- user from the register.
-- ---------------------------------------------------------------------------
create or replace function public.raise_risk(
  p_type            public.risk_type,
  p_subject_type    public.risk_subject,
  p_subject_id      uuid,
  p_detail          text,
  p_severity        public.risk_severity default 'medium',
  p_organisation_id uuid default null
)
returns public.risk
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_risk public.risk;
begin
  if coalesce(trim(p_detail), '') = '' then
    raise exception 'a risk needs a description' using errcode = 'check_violation';
  end if;

  insert into public.risk (
    type, subject_type, subject_id, detail, severity, organisation_id,
    raised_by, raised_by_id
  ) values (
    p_type, p_subject_type, p_subject_id, trim(p_detail), p_severity, p_organisation_id,
    (case when auth.uid() is null then 'system' else 'user' end)::public.risk_source,
    auth.uid()
  ) returning * into v_risk;

  return v_risk;
end;
$$;

/**
 * Record that PICK told the client, and what they said back.
 *
 * Moves the risk from `open` to `advised`. A risk that was never advised stays
 * open, which is the whole point of the distinction.
 */
create or replace function public.advise_on_risk(
  p_risk_id uuid,
  p_content text,
  p_channel text default 'email'
)
returns public.risk_advisory
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_advisory public.risk_advisory;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may advise on a risk'
      using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_content), '') = '' then
    raise exception 'say what the client was told' using errcode = 'check_violation';
  end if;

  insert into public.risk_advisory (risk_id, advised_by, channel, content)
  values (p_risk_id, auth.uid(), p_channel, trim(p_content))
  returning * into v_advisory;

  update public.risk set status = 'advised'
   where id = p_risk_id and status = 'open';

  return v_advisory;
end;
$$;

revoke all on function public.raise_risk(public.risk_type, public.risk_subject, uuid, text, public.risk_severity, uuid) from public, anon;
revoke all on function public.advise_on_risk(uuid, text, text) from public, anon;
grant execute on function public.raise_risk(public.risk_type, public.risk_subject, uuid, text, public.risk_severity, uuid) to authenticated;
grant execute on function public.advise_on_risk(uuid, text, text) to authenticated;
