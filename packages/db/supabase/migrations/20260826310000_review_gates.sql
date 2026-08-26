-- ---------------------------------------------------------------------------
-- One configurable gate, replacing the hardcoded "first three audits" (TND-81).
--
-- Tiers only ever handled auditor trust. A gate handles risk from any source:
-- a new auditor, a proven auditor's first lottery, the first audit for a new
-- client, an assignment carrying an open risk.
--
-- The two things it can hold are INDEPENDENT and must stay that way:
--
--   payment         is the audit complete and competent?  PICK QA owns this.
--   client_release  may the client see it?                PICK QA owns this too.
--
-- A quality hold must never become a pay delay. That separation is the whole
-- of TND-79: if an auditor's fee waits on anything a client does, the auditor
-- is being paid to keep the subject of the audit happy.
--
-- ⚠️ Triggers are a FIXED ENUM, not authorable. Adding one means shipping
-- code. A generic expression evaluator would be more complex than the tiers it
-- replaced, and would be configured once and then never understood.
-- ---------------------------------------------------------------------------

create type public.review_gate_trigger as enum (
  'auditor_first_n_audits',
  'auditor_first_of_type',
  'client_first_audit',
  'audit_type_is_lottery',
  'assignment_has_open_risk',
  'manual'
);

create type public.review_gate_mode as enum ('auto_approve', 'notify', 'hold');
create type public.review_gate_scope as enum ('payment', 'client_release', 'both');
create type public.review_timeout_action as enum ('auto_approve', 'escalate');

create table public.review_gate (
  id           uuid primary key default public.uuid_generate_v7(),
  trigger      public.review_gate_trigger not null unique,
  mode         public.review_gate_mode not null default 'hold',
  scope        public.review_gate_scope not null default 'client_release',
  approver_id  uuid references public.user_profile (id),
  -- Mandatory on a hold. Without it a blocked queue puts auditors back to
  -- waiting on one person's availability, which is the exact failure the
  -- payment model was designed to avoid.
  timeout_days integer not null default 3,
  on_timeout   public.review_timeout_action not null default 'auto_approve',
  enabled      boolean not null default true,
  threshold    integer,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint gate_timeout_positive check (timeout_days > 0)
);

create trigger review_gate_touch before update on public.review_gate
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Defaults. Payment clears itself; nothing reaches a client unreviewed.
-- ---------------------------------------------------------------------------
insert into public.review_gate (trigger, mode, scope, threshold) values
  ('auditor_first_n_audits',   'hold',   'client_release', 3),
  ('auditor_first_of_type',    'notify', 'client_release', null),
  ('client_first_audit',       'hold',   'client_release', null),
  ('audit_type_is_lottery',    'hold',   'both',           null),
  ('assignment_has_open_risk', 'hold',   'client_release', null),
  ('manual',                   'hold',   'both',           null);

-- ---------------------------------------------------------------------------
-- Which gates match this audit. One row per matching, enabled gate.
--
-- Every trigger is a query written out in full. That is deliberate: it can be
-- read, diffed and grepped, and adding a trigger is a code change reviewed
-- like any other.
-- ---------------------------------------------------------------------------
create or replace function public.matching_review_gates(p_audit_id uuid)
returns table (
  trigger public.review_gate_trigger,
  mode    public.review_gate_mode,
  scope   public.review_gate_scope,
  reason  text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with a as (select * from public.audit where id = p_audit_id)
  select g.trigger, g.mode, g.scope, r.reason
  from public.review_gate g
  join lateral (
    select case g.trigger
      -- Requires an auditor: an audit nobody has accepted is not gated on
      -- their track record, it simply has not got one yet.
      when 'auditor_first_n_audits' then (
        select format('Auditor''s first %s audits are reviewed. This is number %s.',
                      coalesce(g.threshold, 3), c.released + 1)
        from a
        cross join lateral (
          select count(*) as released from public.audit x
          where x.auditor_id = a.auditor_id and x.status = 'released' and x.id <> a.id
        ) c
        where a.auditor_id is not null and c.released < coalesce(g.threshold, 3)
      )
      when 'auditor_first_of_type' then (
        select format('Auditor''s first %s audit.', a.audit_type)
        from a
        where a.auditor_id is not null and not exists (
          select 1 from public.audit x
          where x.auditor_id = a.auditor_id and x.audit_type = a.audit_type
            and x.status = 'released' and x.id <> a.id
        )
      )
      when 'client_first_audit' then (
        select 'First audit for this charity.'
        from a
        where not exists (
          select 1 from public.audit x
          where x.client_organisation_id = a.client_organisation_id
            and x.status = 'released' and x.id <> a.id
        )
      )
      when 'audit_type_is_lottery' then (
        select 'Lottery fundraising carries external regulatory exposure.'
        from a where a.audit_type = 'lottery'
      )
      when 'assignment_has_open_risk' then (
        select format('%s open risk(s) recorded against this assignment.', count(*))
        from public.risk
        where subject_type = 'assignment' and subject_id = p_audit_id
          and status in ('open', 'advised')
        having count(*) > 0
      )
      when 'manual' then (
        select 'Flagged for review by PICK.' from a where a.review_note is not null
      )
    end as reason
  ) r on r.reason is not null
  where g.enabled;
$$;

-- ---------------------------------------------------------------------------
-- What is actually held, resolved independently for each of the two things a
-- gate can hold. Multiple matching gates resolve to the most restrictive.
-- ---------------------------------------------------------------------------
create or replace function public.audit_gate_state(p_audit_id uuid)
returns table (payment public.review_gate_mode, client_release public.review_gate_mode)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with matched as (select * from public.matching_review_gates(p_audit_id)),
  ranked as (
    select
      scope,
      max(case mode when 'hold' then 2 when 'notify' then 1 else 0 end) as level
    from matched group by scope
  ),
  level_for as (
    select
      coalesce(max(level) filter (where scope in ('payment', 'both')), 0) as payment,
      coalesce(max(level) filter (where scope in ('client_release', 'both')), 0) as release
    from ranked
  )
  select
    (case payment when 2 then 'hold' when 1 then 'notify' else 'auto_approve' end)::public.review_gate_mode,
    (case release when 2 then 'hold' when 1 then 'notify' else 'auto_approve' end)::public.review_gate_mode
  from level_for;
$$;

-- Reads better than a join at every call site, and keeps the old name working.
create or replace function public.review_gate_reason(p_audit_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select string_agg(reason, ' ') from public.matching_review_gates(p_audit_id)
$$;

revoke all on function public.matching_review_gates(uuid) from public, anon;
revoke all on function public.audit_gate_state(uuid) from public, anon;
grant execute on function public.matching_review_gates(uuid) to authenticated;
grant execute on function public.audit_gate_state(uuid) to authenticated;

grant select on public.review_gate to authenticated;
grant insert, update, delete on public.review_gate to authenticated;
alter table public.review_gate enable row level security;

create policy review_gate_read on public.review_gate
  for select to authenticated using (app.is_admin());
create policy review_gate_admin on public.review_gate
  for all to authenticated using (app.is_admin()) with check (app.is_admin());
