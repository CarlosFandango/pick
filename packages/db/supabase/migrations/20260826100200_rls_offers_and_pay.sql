-- ---------------------------------------------------------------------------
-- RLS for audit_offer and audit_pay_item.
--
-- An offer is the only thing an auditor sees before accepting, so it must not
-- carry the pitch detail — that lives on `audit`, which an auditor cannot read
-- until they are the assigned auditor.
-- ---------------------------------------------------------------------------

alter table public.audit_offer    enable row level security;
alter table public.audit_pay_item enable row level security;

-- audit_offer: an auditor sees offers made to them; admin sees all. Clients do
-- not see who was offered what — that is PICK's matching, not theirs.
create policy audit_offer_read on public.audit_offer for select to authenticated
  using (app.is_admin() or auditor_id = auth.uid());

-- The auditor may only respond to their own offer, and only to accept or
-- decline. Everything else about an offer is PICK's to set.
create policy audit_offer_respond on public.audit_offer for update to authenticated
  using (auditor_id = auth.uid() and outcome = 'offered')
  with check (auditor_id = auth.uid() and outcome in ('accepted', 'declined'));

create policy audit_offer_admin_write on public.audit_offer for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- audit_pay_item: the auditor sees their own itemised pay; admin sees all.
-- Clients never see auditor pay.
create policy audit_pay_item_read on public.audit_pay_item for select to authenticated
  using (
    app.is_admin()
    or exists (
      select 1 from public.audit a
      where a.id = audit_pay_item.audit_id and a.auditor_id = auth.uid()
    )
  );

create policy audit_pay_item_admin_write on public.audit_pay_item for all to authenticated
  using (app.is_admin()) with check (app.is_admin());
