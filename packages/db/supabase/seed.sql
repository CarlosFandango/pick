-- ---------------------------------------------------------------------------
-- Seed data. Runs on `supabase db reset`. Safe to re-run.
--
-- The check catalogue, version 1. Every prompt is written the way an auditor
-- would think about it in the moment. compliance_category is bookkeeping for
-- scoring and must never appear in the field app.
-- ---------------------------------------------------------------------------

insert into public.organisation (name, org_type, residency_zone)
select 'PICK', 'pick', 'uk'
where not exists (select 1 from public.organisation where org_type = 'pick');

insert into public.check_definition
  (code, version, moment, compliance_category, prompt, weight, is_critical, sort_order)
values
  ('APR-01', 1, 'approach', 'identification', 'Was the ID badge visible and readable before the fundraiser spoke to anyone?', 2, false, 10),
  ('APR-02', 1, 'approach', 'site_conduct', 'Was the fundraiser working from the position agreed with the site?', 1, false, 20),
  ('APR-03', 1, 'approach', 'site_conduct', 'Were doorways, crossings and the pavement kept clear?', 1, false, 30),
  ('APR-04', 1, 'approach', 'identification', 'Was the agency name visible on clothing or materials, as well as the charity name?', 1, false, 40),
  ('WLK-01', 1, 'walk_up', 'pressure_and_persistence', 'Did the fundraiser let the person stop of their own accord rather than stepping into their path?', 2, false, 10),
  ('WLK-02', 1, 'walk_up', 'site_conduct', 'Did the fundraiser keep an arm''s length and make no physical contact?', 2, true, 20),
  ('WLK-03', 1, 'walk_up', 'vulnerability', 'Did the fundraiser move on from anyone who appeared unwell, distressed or confused?', 3, true, 30),
  ('OPN-01', 1, 'opening', 'identification', 'Did the fundraiser give their own name and the full name of the charity?', 2, false, 10),
  ('OPN-02', 1, 'opening', 'solicitation_statement', 'Did the fundraiser say they are paid, and name the agency employing them?', 3, true, 20),
  ('OPN-03', 1, 'opening', 'honesty_and_accuracy', 'Was the charity named in full, without an abbreviation that could be mistaken for another organisation?', 1, false, 30),
  ('PIT-01', 1, 'pitch', 'honesty_and_accuracy', 'Were the claims made about the work of the charity accurate and free of exaggeration?', 3, false, 10),
  ('PIT-02', 1, 'pitch', 'honesty_and_accuracy', 'Did the fundraiser avoid saying or implying that money goes somewhere it does not?', 3, true, 20),
  ('PIT-03', 1, 'pitch', 'vulnerability', 'Did the fundraiser check the person had understood before carrying on?', 2, false, 30),
  ('PIT-04', 1, 'pitch', 'pressure_and_persistence', 'Did the fundraiser leave room for the person to speak or walk away?', 1, false, 40),
  ('ASK-01', 1, 'ask', 'pressure_and_persistence', 'Did the fundraiser accept the first clear refusal and stop asking?', 3, true, 10),
  ('ASK-02', 1, 'ask', 'pressure_and_persistence', 'Did the fundraiser avoid guilt, urgency or emotional pressure to get agreement?', 3, true, 20),
  ('ASK-03', 1, 'ask', 'honesty_and_accuracy', 'Was the amount stated clearly, including how often it would be taken?', 2, false, 30),
  ('ASK-04', 1, 'ask', 'consent_and_cancellation', 'Was it made clear this is an ongoing commitment rather than a one-off gift?', 2, false, 40),
  ('TAB-01', 1, 'tablet', 'data_protection', 'Was the privacy notice shown or read out before any personal details were entered?', 3, true, 10),
  ('TAB-02', 1, 'tablet', 'data_protection', 'Was the screen kept out of view of passers-by while details were entered?', 1, false, 20),
  ('TAB-03', 1, 'tablet', 'data_protection', 'Were marketing preferences left unticked for the person to choose themselves?', 3, true, 30),
  ('TAB-04', 1, 'tablet', 'record_keeping', 'Were the details read back and confirmed before the form was submitted?', 2, false, 40),
  ('SGN-01', 1, 'sign_up', 'consent_and_cancellation', 'Was the Direct Debit Guarantee explained?', 2, false, 10),
  ('SGN-02', 1, 'sign_up', 'safeguarding', 'Did the fundraiser confirm the person is 18 or over?', 3, true, 20),
  ('SGN-03', 1, 'sign_up', 'consent_and_cancellation', 'Was the person told how to cancel, and left with contact details to keep?', 2, false, 30),
  ('SGN-04', 1, 'sign_up', 'record_keeping', 'Did the person get confirmation of exactly what they had agreed to?', 1, false, 40),
  ('CLS-01', 1, 'close', 'site_conduct', 'Did the fundraiser close courteously regardless of the outcome?', 1, false, 10),
  ('CLS-02', 1, 'close', 'pressure_and_persistence', 'Did the fundraiser avoid a second ask once the person had declined and moved away?', 2, true, 20),
  ('CLS-03', 1, 'close', 'record_keeping', 'Did the fundraiser log the interaction as the agency requires?', 1, false, 30)
on conflict (code, version) do nothing;

-- ---------------------------------------------------------------------------
-- LOCAL DEVELOPMENT ONLY.
--
-- seed.sql runs on `supabase db reset`, which is a local command. It is never
-- executed by `supabase db push`, so these accounts cannot reach a hosted
-- project. The password is deliberately obvious; if you ever find yourself
-- wanting to reuse it somewhere real, stop.
--
-- Gives the golden path something to run against: one charity with credits,
-- one client, one approved auditor, one PICK admin.
-- ---------------------------------------------------------------------------

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  -- GoTrue scans these as strings; NULL makes some versions error on login.
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select v.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       v.email, crypt('picksel-dev', gen_salt('bf')),
       now(), now(), now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
       '', '', '', ''
from (values
  ('00000000-0000-7000-8000-0000000000d1'::uuid, 'client@example.test'),
  ('00000000-0000-7000-8000-0000000000d2'::uuid, 'auditor@example.test'),
  ('00000000-0000-7000-8000-0000000000d3'::uuid, 'admin@example.test')
) as v(id, email)
where not exists (select 1 from auth.users where auth.users.id = v.id);

insert into public.organisation (id, name, org_type, residency_zone, charity_number)
select '00000000-0000-7000-8000-0000000000c1', 'St Luke''s Hospice', 'charity', 'uk', '1012345'
where not exists (
  select 1 from public.organisation where id = '00000000-0000-7000-8000-0000000000c1'
);

insert into public.user_profile (id, organisation_id, role, full_name, email, status)
select * from (values
  ('00000000-0000-7000-8000-0000000000d1'::uuid, '00000000-0000-7000-8000-0000000000c1'::uuid,
   'client'::public.app_role, 'Dev Client', 'client@example.test', 'active'::public.user_status),
  ('00000000-0000-7000-8000-0000000000d2'::uuid, null,
   'auditor', 'Dev Auditor', 'auditor@example.test', 'active'),
  ('00000000-0000-7000-8000-0000000000d3'::uuid, null,
   'pick_admin', 'Dev Admin', 'admin@example.test', 'active')
) as v(id, organisation_id, role, full_name, email, status)
where not exists (select 1 from public.user_profile where public.user_profile.id = v.id);

insert into public.auditor_profile (user_id, approval_status, approved_at, base_postcode)
select '00000000-0000-7000-8000-0000000000d2', 'approved', now(), 'SE15 4QL'
where not exists (
  select 1 from public.auditor_profile where user_id = '00000000-0000-7000-8000-0000000000d2'
);

insert into public.auditor_coverage (auditor_id, postcode_area)
select '00000000-0000-7000-8000-0000000000d2', area
from (values ('SE'), ('SW'), ('E')) as v(area)
where not exists (
  select 1 from public.auditor_coverage
  where auditor_id = '00000000-0000-7000-8000-0000000000d2' and postcode_area = v.area
);

-- Four credits, matching the mockup's header.
insert into public.credit_transaction (organisation_id, delta, reason, unit_price_pence, note)
select '00000000-0000-7000-8000-0000000000c1', 4, 'purchase', 17500, 'Local development seed'
where not exists (
  select 1 from public.credit_transaction
  where organisation_id = '00000000-0000-7000-8000-0000000000c1' and reason = 'purchase'
);
