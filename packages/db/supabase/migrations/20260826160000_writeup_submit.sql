-- ---------------------------------------------------------------------------
-- Slice 7 — S1.6 Write-up submit.
--
-- The draft lives on the device until the auditor submits. Submitting writes
-- the verdicts as CheckResults — append-only, device-minted ids, so a retry
-- over a bad connection is a no-op rather than a duplicate audit.
--
-- Corrections after submit are new rows, never edits. An audit trail that can
-- be rewritten is not one.
-- ---------------------------------------------------------------------------

-- Which moments PICK unlocked when returning a write-up. Empty means the
-- write-up was never returned.
alter table public.audit
  add column returned_moments public.audit_moment[] not null default '{}',
  add column returned_at timestamptz,
  add column review_note text;

create or replace function public.submit_write_up(
  p_audit_id uuid,
  p_results  jsonb
)
returns public.audit
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_audit    public.audit;
  v_expected integer;
  v_given    integer;
begin
  select * into v_audit from public.audit where id = p_audit_id for update;

  if v_audit.id is null then
    raise exception 'no such audit' using errcode = 'no_data_found';
  end if;
  if v_audit.auditor_id is distinct from auth.uid() then
    raise exception 'this audit is not yours' using errcode = 'insufficient_privilege';
  end if;
  if v_audit.status not in ('assigned', 'in_progress') then
    raise exception 'this audit cannot be written up from %', v_audit.status
      using errcode = 'check_violation';
  end if;

  -- Every check in the catalogue version this audit was pinned to must have a
  -- verdict. A partial write-up is not an audit, and PICK cannot review what
  -- is not there.
  select count(*) into v_expected
  from public.check_definition
  where version = v_audit.check_set_version and is_active;

  select count(distinct (r ->> 'check_definition_id')) into v_given
  from jsonb_array_elements(p_results) r;

  if v_given < v_expected then
    raise exception 'write-up is incomplete: % of % checks answered', v_given, v_expected
      using errcode = 'check_violation';
  end if;

  -- Ids come from the device, so re-submitting after a dropped connection
  -- lands on the same rows instead of duplicating the audit.
  insert into public.check_result (
    id, audit_id, check_definition_id, auditor_id, outcome, note, occurred_at
  )
  select
    (r ->> 'id')::uuid,
    p_audit_id,
    (r ->> 'check_definition_id')::uuid,
    v_audit.auditor_id,
    (r ->> 'outcome')::public.check_outcome,
    nullif(r ->> 'note', ''),
    coalesce((r ->> 'occurred_at')::timestamptz, now())
  from jsonb_array_elements(p_results) r
  on conflict (id) do nothing;

  update public.audit
     set status = 'in_review',
         submitted_at = now(),
         returned_moments = '{}',
         returned_at = null
   where id = p_audit_id
  returning * into v_audit;

  return v_audit;
end;
$$;

-- ---------------------------------------------------------------------------
-- PICK returns a write-up, unlocking only the moments that need rework.
-- ---------------------------------------------------------------------------
create or replace function public.return_write_up(
  p_audit_id uuid,
  p_moments  public.audit_moment[],
  p_note     text default null
)
returns public.audit
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_audit public.audit;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may return a write-up'
      using errcode = 'insufficient_privilege';
  end if;
  if array_length(p_moments, 1) is null then
    raise exception 'say which moments need rework' using errcode = 'check_violation';
  end if;

  update public.audit
     set status = 'in_progress',
         returned_moments = p_moments,
         returned_at = now(),
         review_note = p_note
   where id = p_audit_id and status = 'in_review'
  returning * into v_audit;

  if v_audit.id is null then
    raise exception 'only an audit in review can be returned' using errcode = 'check_violation';
  end if;

  return v_audit;
end;
$$;

revoke all on function public.submit_write_up(uuid, jsonb) from public, anon;
revoke all on function public.return_write_up(uuid, public.audit_moment[], text) from public, anon;
grant execute on function public.submit_write_up(uuid, jsonb) to authenticated;
grant execute on function public.return_write_up(uuid, public.audit_moment[], text) to authenticated;
