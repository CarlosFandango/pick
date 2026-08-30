-- ---------------------------------------------------------------------------
-- The roster reports what has actually been checked about somebody.
--
-- Vetting is the gate the whole marketplace hangs on — an unapproved auditor
-- is never offered anything — and the screen that does it was showing a name,
-- a postcode and an Approve button. Whoever presses it has to remember, from
-- outside the system, whether they have seen a passport.
--
-- `right_to_work_checked_on` and `dbs_checked_on` have been on
-- `auditor_profile` since it was created and nothing has ever read them.
-- `applied_at` is the profile's own created_at, which is when somebody
-- accepted their invitation and became a real application.
--
-- Additive: the existing columns keep their positions, so nothing that reads
-- this function today has to change.
-- ---------------------------------------------------------------------------
drop function if exists public.auditor_roster();

create function public.auditor_roster()
returns table (
  auditor_id         uuid,
  full_name          text,
  email              text,
  approval_status    public.auditor_approval_status,
  user_status        public.user_status,
  approved_at        timestamptz,
  base_postcode      text,
  base_place         text,
  max_travel_minutes integer,
  travel_mode        public.travel_mode,
  av_capable         boolean,
  areas              text[],
  audit_types        public.audit_type[],
  audits_completed   integer,
  open_conflicts     integer,
  right_to_work_checked_on date,
  dbs_checked_on     date,
  applied_at         timestamptz
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
    bp.name,
    p.max_travel_minutes,
    p.travel_mode,
    p.av_capable,
    coalesce((select array_agg(pl.name order by pl.name)
              from public.auditor_coverage c
              join public.place pl on pl.id = c.place_id
              where c.auditor_id = p.user_id and c.source <> 'excluded'), '{}'),
    coalesce((select array_agg(k.audit_type order by k.audit_type)
              from public.auditor_capability k where k.auditor_id = p.user_id), '{}'),
    (select count(*)::integer from public.audit a
      where a.auditor_id = p.user_id and a.status = 'released'),
    (select count(*)::integer from public.auditor_conflict f where f.auditor_id = p.user_id),
    p.right_to_work_checked_on,
    p.dbs_checked_on,
    p.created_at
  from public.auditor_profile p
  join public.user_profile u on u.id = p.user_id
  left join public.place bp on bp.id = p.base_place_id
  where app.is_admin()
  order by
    (case when u.status = 'invited' then 2
          when p.approval_status = 'pending' then 0
          else 1 end),
    u.full_name;
$$;

revoke all on function public.auditor_roster() from public, anon;
grant execute on function public.auditor_roster() to authenticated;
