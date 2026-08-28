-- ---------------------------------------------------------------------------
-- Local development fixtures. Runs on `supabase db reset`. Safe to re-run.
--
-- LOCAL ONLY. These accounts have an obvious shared password, so this file
-- must never run against a hosted project — and does not: `db reset` is a
-- local command.
--
-- Reference data does NOT belong here, however much it looks like seeding.
-- The check catalogue lived in this file until staging came up with an empty
-- `check_definition` and could not record an audit. Anything the schema needs
-- in order to function goes in a migration; only fake people go here.
-- ---------------------------------------------------------------------------

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

-- The dev auditor is signed off for every methodology, so a locally booked
-- audit has somebody to offer it to.
insert into public.auditor_capability (auditor_id, audit_type)
select '00000000-0000-7000-8000-0000000000d2', t
from (values ('street'::public.audit_type), ('door_to_door'), ('private_site'), ('lottery')) as v(t)
where not exists (
  select 1 from public.auditor_capability
  where auditor_id = '00000000-0000-7000-8000-0000000000d2' and audit_type = v.t
);

-- Four credits, matching the mockup's header.
insert into public.credit_transaction (organisation_id, delta, reason, unit_price_minor_units, note)
select '00000000-0000-7000-8000-0000000000c1', 4, 'purchase', 17500, 'Local development seed'
where not exists (
  select 1 from public.credit_transaction
  where organisation_id = '00000000-0000-7000-8000-0000000000c1' and reason = 'purchase'
);
