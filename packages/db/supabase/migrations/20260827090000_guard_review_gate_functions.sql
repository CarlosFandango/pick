-- ---------------------------------------------------------------------------
-- Close a cross-tenant read through the review gate functions.
--
-- `matching_review_gates`, `audit_gate_state` and `review_gate_reason` are all
-- `security definer` and were granted to `authenticated` with no check on who
-- was asking. They take an audit id and never verify the caller may see that
-- audit, so any signed-in user could read gate state for **any audit in the
-- system**, including another organisation's.
--
-- Reproduced before the fix: an auditor who gets zero rows for charity B's
-- audit through RLS could still call `matching_review_gates` on it and receive
--
--   "First audit for this charity."
--   "Auditor's first 3 audits are reviewed. This is number 1."
--   "2 open risk(s) recorded against this assignment."
--
-- That is another charity's trading history, another auditor's track record,
-- and the count of open risks on an assignment — none of which the caller can
-- reach through any table, because `review_gate` is admin-read-only and RLS
-- covers `audit` and `risk`. The security definer functions routed around all
-- of it.
--
-- These three are admin tools. They back the review screen, and nothing an
-- auditor or a client uses calls them. So the guard is simply "admin only",
-- matching `payable_audits` and the rest of the console functions: a
-- non-admin caller gets no rows rather than an error, because whether a given
-- audit exists is itself something they should not learn.
--
-- Swept every other `security definer` function in `public` at the same time:
-- 21 already check `app.is_admin()`, 8 more are scoped to `auth.uid()`, and
-- these three were the only ones with no guard at all.
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
  -- The guard. Everything above is unchanged; this line is the fix.
  where g.enabled and app.is_admin();
$$;

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
  from level_for
  -- Guarded in its own right rather than relying on the call above. A future
  -- edit that stops routing through `matching_review_gates` would otherwise
  -- reopen this silently, which is exactly how it happened the first time.
  where app.is_admin();
$$;

create or replace function public.review_gate_reason(p_audit_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select string_agg(reason, ' ')
  from public.matching_review_gates(p_audit_id)
  where app.is_admin()
$$;

-- `review_gate_reason` had no revoke of its own, so it kept the default
-- EXECUTE grant to PUBLIC — which is how it reached `anon` as well.
revoke all on function public.review_gate_reason(uuid) from public, anon;
grant execute on function public.review_gate_reason(uuid) to authenticated;
