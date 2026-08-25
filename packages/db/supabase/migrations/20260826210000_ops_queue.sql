-- ---------------------------------------------------------------------------
-- Phase 4 — S4.1 Ops home.
--
-- Today is a queue, not a dashboard. Everything that needs a person lands in
-- one ranked list with the action inline, and the counters are the whole
-- summary: a cockpit for two people, not a BI tool.
--
-- One query, six enumerated sources. Deliberately not a rules engine or a
-- notification system — when the list stops fitting on a screen, that is the
-- signal to reconsider, not before.
-- ---------------------------------------------------------------------------

create type public.ops_item_kind as enum (
  'offer_expiring',
  'review_gate',
  'no_show',
  'complaint',
  'vetting',
  'stale_write_up'
);

/** How long after the shift window a write-up is considered late. */
create or replace function public.write_up_due_hours()
returns integer language sql immutable as $$ select 48 $$;

create or replace function public.ops_queue()
returns table (
  kind        public.ops_item_kind,
  rank        integer,
  reference   text,
  summary     text,
  target_id   uuid,
  since       timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with caller as (select app.is_admin() as ok)
  -- An offer nobody has taken, on an audit whose window is close.
  select 'offer_expiring'::public.ops_item_kind, 1, a.reference,
         format('%s · %s — %s decline%s, window starts %s',
                a.postcode, a.audit_type,
                (select count(*) from public.audit_offer d
                  where d.audit_id = a.id and d.outcome = 'declined'),
                case when (select count(*) from public.audit_offer d
                            where d.audit_id = a.id and d.outcome = 'declined') = 1 then '' else 's' end,
                to_char(a.window_start_on, 'FMDay DD Mon')),
         a.id, a.requested_at
  from public.audit a, caller
  where caller.ok and a.status = 'booked'
    and a.window_start_on <= current_date + 2

  union all
  -- Held for review. The gate reason is on the review screen itself.
  select 'review_gate', 2, a.reference,
         format('%s · %s — submitted %s', a.postcode, a.audit_type,
                to_char(a.submitted_at, 'DD Mon HH24:MI')),
         a.id, a.submitted_at
  from public.audit a, caller
  where caller.ok and a.status = 'in_review'

  union all
  select 'no_show', 3, a.reference,
         format('%s · %s — verify, notify the charity, credit returned',
                a.postcode, a.audit_type),
         a.id, a.no_team_present_at
  from public.audit a, caller
  where caller.ok and a.status = 'no_team_present' and a.no_team_present_at > now() - interval '7 days'

  union all
  select 'complaint', 4, 'CMP',
         format('%s — %s', o.name,
                case c.subject when 'about_audit' then 'about the audit'
                               else 'about a fundraiser' end),
         c.id, c.raised_at
  from public.complaint c
  join public.organisation o on o.id = c.organisation_id, caller
  where caller.ok and c.status = 'open'

  union all
  select 'vetting', 5, 'AUD',
         format('%s auditor application%s waiting',
                count(*), case when count(*) = 1 then '' else 's' end),
         null::uuid, min(ap.created_at)
  from public.auditor_profile ap, caller
  where caller.ok and ap.approval_status = 'pending'
  group by caller.ok
  having count(*) > 0

  union all
  -- The shift is over and the write-up has not arrived.
  select 'stale_write_up', 6, a.reference,
         format('%s · write-up due %s hours after the shift',
                a.postcode, public.write_up_due_hours()),
         a.id, a.window_end_on::timestamptz
  from public.audit a, caller
  where caller.ok and a.status in ('assigned', 'in_progress')
    and a.window_end_on < current_date
    and a.window_end_on::timestamptz < now() - make_interval(hours => public.write_up_due_hours())

  order by 2, 6;
$$;

/** The four counters. Everything else on the screen is the queue itself. */
create or replace function public.ops_counters()
returns table (
  needs_a_human       integer,
  in_flight_today     integer,
  offers_awaiting     integer,
  released_this_week  integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (select count(*)::integer from public.ops_queue()),
    (select count(*)::integer from public.audit
      where status in ('assigned', 'in_progress')
        and current_date between window_start_on and window_end_on),
    (select count(*)::integer from public.audit_offer where outcome = 'offered'),
    (select count(*)::integer from public.audit
      where status = 'released' and released_at > now() - interval '7 days')
  where app.is_admin();
$$;

revoke all on function public.ops_queue() from public, anon;
revoke all on function public.ops_counters() from public, anon;
grant execute on function public.ops_queue() to authenticated;
grant execute on function public.ops_counters() to authenticated;
