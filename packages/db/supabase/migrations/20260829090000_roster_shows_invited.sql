-- ---------------------------------------------------------------------------
-- Tell the roster who has actually turned up (TND-92).
--
-- An invited auditor gets their `auditor_profile` row at invite time, so from
-- S4.3's point of view they arrived in the vetting queue the moment PICK sent
-- the email — before they had entered a postcode, a coverage area or a name.
--
-- "3 awaiting vetting" has to mean three people who can be vetted. Counting
-- invitations alongside them makes the one number the ops queue points at
-- untrue, and the queue is the thing that decides whether anyone looks.
--
-- Note the DROP. `create or replace` cannot change a function's return type,
-- and a signature change silently creates a SECOND function rather than
-- replacing the first — the overload trap recorded in PITFALLS. Dropping
-- first is the only way to be sure callers get this one.
-- ---------------------------------------------------------------------------

drop function if exists public.auditor_roster();

create function public.auditor_roster()
returns table (
  auditor_id        uuid,
  full_name         text,
  approval_status   public.auditor_approval_status,
  -- invited = sent a link, not yet accepted. active = ready to be vetted.
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
