-- ---------------------------------------------------------------------------
-- The front half of auditor onboarding (TND-92).
--
-- The back half already existed: `approval_status`, `approve_auditor`, the
-- vetting queue on S4.3. What was missing was any way for a real person to
-- become `pending` — an `auditor_profile` row could only arrive from seed.sql
-- or hand-written SQL, so every screen the auditor loop is made of was
-- reachable only by people who do not exist outside a laptop.
--
-- Two statuses, already modelled, and they stay separate:
--
--   user_profile.status              invited → active   have they turned up?
--   auditor_profile.approval_status  pending → approved may they be offered work?
--
-- Accepting an invite moves the first. **Only PICK moves the second.** They are
-- different questions with different owners, and fusing them would let anyone
-- holding an invite link put themselves on the roster.
-- ---------------------------------------------------------------------------

-- Who invited them. One column rather than an `auditor_invite` table: the row
-- itself already records that an invite happened (`status = 'invited'`) and
-- when (`created_at`); the actor was the only fact missing.
alter table public.user_profile
  add column invited_by uuid references public.user_profile (id);

comment on column public.user_profile.invited_by is
  'PICK admin who sent the invite. Null for accounts created any other way — '
  'including the public sign-up route, when that exists.';

-- ---------------------------------------------------------------------------
-- Accepting an invite: the auditor fills in their own details, once.
--
-- Takes no id. The caller is `auth.uid()` and cannot be anyone else — an id
-- parameter on a `security definer` function is an invitation to pass someone
-- else's, which is the exact shape recorded in PITFALLS.
--
-- Note what this function does NOT do: it never writes `approval_status`. An
-- auditor completing their profile becomes visible to vetting, not approved by
-- it. That line is the security boundary of this whole feature.
-- ---------------------------------------------------------------------------
create or replace function public.complete_auditor_profile(
  p_full_name     text,
  p_base_postcode text,
  p_areas         text[],
  p_audit_types   public.audit_type[],
  p_av_capable    boolean default false
)
returns public.auditor_profile
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user    uuid := auth.uid();
  v_profile public.auditor_profile;
  v_area    text;
begin
  if v_user is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;

  -- Invited-and-not-yet-accepted is the only state this is legal in. It is a
  -- once-only transition, not an edit surface: letting an active auditor
  -- re-run it would make coverage silently editable by the person whose work
  -- it decides, with no record of the change.
  if not exists (
    select 1 from public.user_profile
    where id = v_user and role = 'auditor' and status = 'invited'
  ) then
    raise exception 'this invitation has already been used, or is not yours'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'we need a name to put on the roster'
      using errcode = 'check_violation';
  end if;

  if coalesce(array_length(p_areas, 1), 0) = 0 then
    raise exception 'an auditor covers at least one postcode area'
      using errcode = 'check_violation';
  end if;

  if coalesce(array_length(p_audit_types, 1), 0) = 0 then
    raise exception 'an auditor runs at least one kind of audit'
      using errcode = 'check_violation';
  end if;

  -- Checked here as well as by the column constraint, so the message is a
  -- sentence rather than a constraint name. The column remains the authority.
  foreach v_area in array p_areas loop
    if upper(trim(v_area)) !~ '^[A-Z]{1,2}$' then
      raise exception '% is not a postcode area — use the letters only, like SW or EH', v_area
        using errcode = 'check_violation';
    end if;
  end loop;

  update public.user_profile
     set full_name = trim(p_full_name),
         status    = 'active'
   where id = v_user;

  update public.auditor_profile
     set base_postcode = upper(trim(p_base_postcode)),
         av_capable    = coalesce(p_av_capable, false)
   where user_id = v_user
  returning * into v_profile;

  -- Replace rather than merge: this runs once, so there is nothing to merge
  -- with, and a partial write would leave coverage half-stated.
  delete from public.auditor_coverage where auditor_id = v_user;
  insert into public.auditor_coverage (auditor_id, postcode_area)
  select distinct v_user, upper(trim(a)) from unnest(p_areas) as a;

  delete from public.auditor_capability where auditor_id = v_user;
  insert into public.auditor_capability (auditor_id, audit_type)
  select distinct v_user, t from unnest(p_audit_types) as t;

  return v_profile;
end;
$$;

revoke all on function public.complete_auditor_profile(text, text, text[], public.audit_type[], boolean)
  from public, anon;
grant execute on function public.complete_auditor_profile(text, text, text[], public.audit_type[], boolean)
  to authenticated;
