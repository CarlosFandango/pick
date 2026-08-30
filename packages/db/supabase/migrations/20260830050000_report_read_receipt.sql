-- ---------------------------------------------------------------------------
-- When a charity opened a report.
--
-- The audit list groups by what each group MEANS to a charity, and the only
-- group that ever wants a person is "ready for you". Without a read receipt
-- that group only grows: a director with a year of history is told twelve
-- reports are ready to read, eleven of which they read months ago, and the
-- one sentence at the top of the screen becomes the least true thing on it.
--
-- A function rather than an UPDATE policy on `audit`. Clients have no update
-- grant on that table at all today, which is the right default — opening it
-- for one timestamp would open every column the role can already see. This is
-- the shape CLAUDE.md points at: the rule lives in testable code, and
-- `pnpm test:rls` exercises it as `authenticated`.
--
-- Idempotent: the first open is the fact worth keeping. Re-opening a report
-- does not move the timestamp, so "read on 20 July" stays true.
-- ---------------------------------------------------------------------------

alter table public.audit add column report_read_at timestamptz;

comment on column public.audit.report_read_at is
  'When the client organisation first opened the released report. Null until then.';

create or replace function public.mark_report_read(p_audit_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Only the charity that paid for it, and only once it has a report to read.
  -- An admin viewing a report is not the charity reading it, so this
  -- deliberately does nothing for them: the receipt would be a lie.
  update public.audit
     set report_read_at = now()
   where id = p_audit_id
     and status = 'released'
     and report_read_at is null
     and client_organisation_id = app.current_org();
end;
$$;

revoke all on function public.mark_report_read(uuid) from public, anon;
grant execute on function public.mark_report_read(uuid) to authenticated;
