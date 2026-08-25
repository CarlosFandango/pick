-- ---------------------------------------------------------------------------
-- Row level security.
--
-- Reading rule of thumb:
--   pick_admin  sees and does everything
--   client      is scoped to its own organisation
--   auditor     is scoped to audits assigned to it
--
-- Writes that need to cross those lines (invites, credit purchases, matching,
-- payout runs) go through portal server actions on the service role, where the
-- business rule lives in code and can be tested.
-- ---------------------------------------------------------------------------

-- Identity helpers. security definer so a policy on user_profile does not
-- recurse into itself.
create or replace function app.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.user_profile where id = auth.uid();
$$;

create or replace function app.current_org()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select organisation_id from public.user_profile where id = auth.uid();
$$;

create or replace function app.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(app.current_role() = 'pick_admin', false);
$$;

-- Does the current auditor own this audit?
create or replace function app.owns_audit(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.audit
    where id = target and auditor_id = auth.uid()
  );
$$;

-- Is this audit the current client's?
create or replace function app.audit_in_org(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.audit
    where id = target and client_organisation_id = app.current_org()
  );
$$;

grant execute on all functions in schema app to authenticated;

alter table public.organisation         enable row level security;
alter table public.user_profile         enable row level security;
alter table public.auditor_profile      enable row level security;
alter table public.auditor_coverage     enable row level security;
alter table public.audit                enable row level security;
alter table public.check_definition     enable row level security;
alter table public.observation_log      enable row level security;
alter table public.check_result         enable row level security;
alter table public.evidence_attachment  enable row level security;
alter table public.credit_transaction   enable row level security;
alter table public.payout_run           enable row level security;
alter table public.payout_line_item     enable row level security;

-- organisation -------------------------------------------------------------
create policy organisation_read on public.organisation for select to authenticated
  using (app.is_admin() or id = app.current_org());
create policy organisation_admin_write on public.organisation for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- user_profile -------------------------------------------------------------
create policy user_profile_read on public.user_profile for select to authenticated
  using (
    id = auth.uid()
    or app.is_admin()
    or (organisation_id is not null and organisation_id = app.current_org())
  );
create policy user_profile_admin_write on public.user_profile for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- auditor_profile / coverage ------------------------------------------------
create policy auditor_profile_read on public.auditor_profile for select to authenticated
  using (user_id = auth.uid() or app.is_admin());
create policy auditor_profile_admin_write on public.auditor_profile for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

create policy auditor_coverage_read on public.auditor_coverage for select to authenticated
  using (auditor_id = auth.uid() or app.is_admin());
create policy auditor_coverage_admin_write on public.auditor_coverage for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- audit ---------------------------------------------------------------------
create policy audit_read on public.audit for select to authenticated
  using (
    app.is_admin()
    or auditor_id = auth.uid()
    or client_organisation_id = app.current_org()
  );
create policy audit_client_insert on public.audit for insert to authenticated
  with check (app.is_admin() or client_organisation_id = app.current_org());
create policy audit_update on public.audit for update to authenticated
  using (app.is_admin() or auditor_id = auth.uid())
  with check (app.is_admin() or auditor_id = auth.uid());
create policy audit_admin_delete on public.audit for delete to authenticated
  using (app.is_admin());

-- check_definition: catalogue is readable by everyone signed in ------------
create policy check_definition_read on public.check_definition for select to authenticated
  using (true);
create policy check_definition_admin_write on public.check_definition for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- field events: insert by the owning auditor, read by admin/auditor/client --
create policy observation_log_read on public.observation_log for select to authenticated
  using (app.is_admin() or auditor_id = auth.uid() or app.audit_in_org(audit_id));
create policy observation_log_insert on public.observation_log for insert to authenticated
  with check (auditor_id = auth.uid() and app.owns_audit(audit_id));

create policy check_result_read on public.check_result for select to authenticated
  using (app.is_admin() or auditor_id = auth.uid() or app.audit_in_org(audit_id));
create policy check_result_insert on public.check_result for insert to authenticated
  with check (auditor_id = auth.uid() and app.owns_audit(audit_id));

create policy evidence_attachment_read on public.evidence_attachment for select to authenticated
  using (app.is_admin() or app.owns_audit(audit_id) or app.audit_in_org(audit_id));
create policy evidence_attachment_insert on public.evidence_attachment for insert to authenticated
  with check (app.owns_audit(audit_id));
create policy evidence_attachment_admin_write on public.evidence_attachment for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- credit_transaction: read own org, write is admin/service only ------------
create policy credit_transaction_read on public.credit_transaction for select to authenticated
  using (app.is_admin() or organisation_id = app.current_org());
create policy credit_transaction_admin_insert on public.credit_transaction for insert to authenticated
  with check (app.is_admin());

-- payouts: admin, plus auditors seeing their own lines ---------------------
create policy payout_run_admin on public.payout_run for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

create policy payout_line_item_read on public.payout_line_item for select to authenticated
  using (app.is_admin() or auditor_id = auth.uid());
create policy payout_line_item_admin_write on public.payout_line_item for all to authenticated
  using (app.is_admin()) with check (app.is_admin());
