-- ---------------------------------------------------------------------------
-- The ops queue counted invitations as applications (TND-92).
--
-- An invited auditor gets a `pending` auditor_profile the moment PICK sends
-- their link, so "2 auditor applications waiting" could mean one person who
-- applied and one who has not replied to an email. The queue is a list of
-- things a person can do something about, and an unopened invitation is not
-- one of them.
--
-- Same fix as the roster got, in the second place that counts the same thing.
-- Two counts of one fact is why they disagreed; there is no third.
-- ---------------------------------------------------------------------------

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
  from public.auditor_profile ap
  join public.user_profile u on u.id = ap.user_id, caller
  where caller.ok and ap.approval_status = 'pending'
    -- Somebody who has not opened their invitation has not applied. Counting
    -- them sends an admin to a queue with nothing in it they can act on.
    and u.status <> 'invited'
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
