-- ---------------------------------------------------------------------------
-- Say who an unaccepted invitation belongs to (TND-92).
--
-- An invited auditor has no name yet — they choose it when they accept — so
-- the roster showed them as "Awaiting their details". With one invitation
-- outstanding that reads fine. With three it is three identical rows, and an
-- admin cannot tell who has not replied, or who to chase, or who to re-invite.
--
-- The email is the only identity that exists before someone accepts, so the
-- roster has to carry it. Admin-only, like everything else this function
-- returns.
--
-- Dropped and recreated rather than replaced: a return type cannot be changed
-- in place, and a changed signature silently creates a second function.
-- ---------------------------------------------------------------------------

drop function if exists public.auditor_roster();

create function public.auditor_roster()
returns table (
  auditor_id        uuid,
  full_name         text,
  email             text,
  approval_status   public.auditor_approval_status,
  user_status       public.user_status,
  approved_at       timestamptz,
  base_postcode     text,
  av_capable        boolean,
  areas             text[],
  audit_types       public.audit_type[],
  audits_completed  integer,
  open_conflicts    integer
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    p.user_id,
    u.full_name,
    u.email,
    p.approval_status,
    u.status,
    p.approved_at,
    p.base_postcode,
    p.av_capable,
    coalesce((select array_agg(c.postcode_area order by c.postcode_area)
              from public.auditor_coverage c where c.auditor_id = p.user_id), '{}'),
    coalesce((select array_agg(k.audit_type order by k.audit_type)
              from public.auditor_capability k where k.auditor_id = p.user_id), '{}'),
    (select count(*)::integer from public.audit a
      where a.auditor_id = p.user_id and a.status = 'released'),
    (select count(*)::integer from public.auditor_conflict f where f.auditor_id = p.user_id)
  from public.auditor_profile p
  join public.user_profile u on u.id = p.user_id
  where app.is_admin()
  order by
    -- Vettable first, invitations last: the queue is a list of things to do,
    -- and an unaccepted invitation is not one of them.
    (case when u.status = 'invited' then 2
          when p.approval_status = 'pending' then 0
          else 1 end),
    u.full_name;
$$;

revoke all on function public.auditor_roster() from public, anon;
grant execute on function public.auditor_roster() to authenticated;
