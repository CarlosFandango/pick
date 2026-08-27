-- ---------------------------------------------------------------------------
-- S3.4, decided: a charity may recognise an auditor across its own audits.
--
-- The code was being derived two ways, for opposite reasons. The client report
-- took the last three digits of the audit reference, so the same auditor read
-- differently in every report — deliberately, so a charity could not build a
-- picture of an individual over time. The S3.2 picker took an md5 of auditor
-- and charity, so the same auditor read the same every time — deliberately, so
-- a charity could re-pick someone they rate.
--
-- Both cannot be true. The picker's rule wins: being able to ask for the
-- auditor who did well last time is a real thing a charity wants, and the code
-- is still meaningless to any other charity, still not reversible into an
-- identity, and still never a name.
--
-- So the report reads the same code the picker shows, through a function rather
-- than by calling auditor_code_for directly: that one takes an auditor id, and
-- handing a client a function that turns ids into codes invites feeding it ids.
-- This one takes an audit and answers only for people entitled to that audit.
-- ---------------------------------------------------------------------------

create or replace function public.audit_auditor_code(p_audit_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.auditor_code_for(a.auditor_id, a.client_organisation_id)
  from public.audit a
  where a.id = p_audit_id
    and a.auditor_id is not null
    and (
      app.is_admin()
      or a.client_organisation_id = app.current_org()
      or a.auditor_id = auth.uid()
    );
$$;

comment on function public.audit_auditor_code is
  'The coded auditor for one audit, as S3.2 codes them. S3.4.';

revoke all on function public.audit_auditor_code(uuid) from public, anon;
grant execute on function public.audit_auditor_code(uuid) to authenticated;
