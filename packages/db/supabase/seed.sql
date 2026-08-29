-- ---------------------------------------------------------------------------
-- Local development fixtures. Runs on `supabase db reset`. Safe to re-run.
--
-- LOCAL ONLY. These accounts share an obvious password, so this file must never
-- run against a hosted project — and does not: `db reset` is a local command
-- and `db push` never executes it. If you ever want to reuse this password
-- somewhere real, stop.
--
-- Reference data does NOT belong here, however much it looks like seeding. The
-- check catalogue lived in this file until staging came up with an empty
-- `check_definition` and could not record an audit. Anything the schema needs
-- in order to function goes in a migration; only fake people and their fake
-- work go here.
--
-- ## What this is for
--
-- Every screen reachable, for every role, after one `pnpm db:reset`. An audit
-- exists in each state the pipeline has, so no flow has to be set up by hand
-- before it can be looked at. Each block below says which screens it lights up
-- — if you add a state, say what it is for, or the next person will not know
-- whether deleting it breaks something.
--
-- Dates are relative to `current_date`, so a reset in six months still has an
-- audit happening the day after tomorrow.
--
--   client@example.test   Dev Client, St Luke's Hospice
--   client-b@example.test Rowan Mercy Trust — a second charity, so admin
--                         screens show more than one and tenant isolation is
--                         visible rather than assumed
--   auditor@example.test  Dev Auditor, approved
--   nadia@example.test    a second approved auditor, so assignment has a choice
--   tom@example.test      awaiting vetting — gives S4.3 a queue
--   ruth@example.test     invited, never accepted — the other S4.3 group
--   admin@example.test    Dev Admin
--
-- Password for all of them: picksel-dev
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
  ('00000000-0000-7000-8000-0000000000d3'::uuid, 'admin@example.test'),
  ('00000000-0000-7000-8000-0000000000d4'::uuid, 'client-b@example.test'),
  ('00000000-0000-7000-8000-0000000000d5'::uuid, 'nadia@example.test'),
  ('00000000-0000-7000-8000-0000000000d6'::uuid, 'tom@example.test'),
  ('00000000-0000-7000-8000-0000000000d7'::uuid, 'ruth@example.test')
) as v(id, email)
where not exists (select 1 from auth.users where auth.users.id = v.id);

insert into public.organisation (id, name, org_type, residency_zone, charity_number)
select * from (values
  ('00000000-0000-7000-8000-0000000000c1'::uuid, 'St Luke''s Hospice',
   'charity'::public.org_type, 'uk'::public.residency_zone, '1012345'),
  ('00000000-0000-7000-8000-0000000000c2'::uuid, 'Rowan Mercy Trust',
   'charity', 'uk', '1099887')
) as v(id, name, org_type, residency_zone, charity_number)
where not exists (select 1 from public.organisation where public.organisation.id = v.id);

insert into public.user_profile (id, organisation_id, role, full_name, email, status)
select * from (values
  ('00000000-0000-7000-8000-0000000000d1'::uuid, '00000000-0000-7000-8000-0000000000c1'::uuid,
   'client'::public.app_role, 'Dev Client', 'client@example.test', 'active'::public.user_status),
  ('00000000-0000-7000-8000-0000000000d4', '00000000-0000-7000-8000-0000000000c2',
   'client', 'Mercy Client', 'client-b@example.test', 'active'),
  ('00000000-0000-7000-8000-0000000000d2', null,
   'auditor', 'Dev Auditor', 'auditor@example.test', 'active'),
  ('00000000-0000-7000-8000-0000000000d5', null,
   'auditor', 'Nadia Osei', 'nadia@example.test', 'active'),
  ('00000000-0000-7000-8000-0000000000d6', null,
   'auditor', 'Tom Beckett', 'tom@example.test', 'active'),
  -- Invited and never accepted: no name yet, because they choose it. S4.3 has
  -- to show them by email or an admin cannot tell one invitation from another.
  ('00000000-0000-7000-8000-0000000000d7', null,
   'auditor', '', 'ruth@example.test', 'invited'),
  ('00000000-0000-7000-8000-0000000000d3', null,
   'pick_admin', 'Dev Admin', 'admin@example.test', 'active')
) as v(id, organisation_id, role, full_name, email, status)
where not exists (select 1 from public.user_profile where public.user_profile.id = v.id);

update public.user_profile
   set invited_by = '00000000-0000-7000-8000-0000000000d3'
 where id = '00000000-0000-7000-8000-0000000000d7' and invited_by is null;

-- ---------------------------------------------------------------------------
-- The auditor network. Three states, so S4.3 is a queue and a roster at once.
-- ---------------------------------------------------------------------------
insert into public.auditor_profile (user_id, approval_status, approved_at, base_postcode, av_capable)
select * from (values
  ('00000000-0000-7000-8000-0000000000d2'::uuid, 'approved'::public.auditor_approval_status,
   now(), 'SE15 4QL', true),
  ('00000000-0000-7000-8000-0000000000d5', 'approved', now(), 'N1 6AH', false),
  -- Awaiting vetting: what the ops queue's `vetting` line points at.
  ('00000000-0000-7000-8000-0000000000d6', 'pending', null, 'M4 1HQ', false),
  -- Invited, so pending too — but filtered out of the vetting count, because
  -- somebody who has not accepted cannot be vetted.
  ('00000000-0000-7000-8000-0000000000d7', 'pending', null, null, false)
) as v(user_id, approval_status, approved_at, base_postcode, av_capable)
where not exists (
  select 1 from public.auditor_profile where public.auditor_profile.user_id = v.user_id
);

-- Where each auditor works, as places. Postcode areas are gone: they were a
-- UK implementation detail that had reached the interface, and an auditor in
-- Dublin has none at all.
--
-- Travel is recorded as they would have said it — how long, and how — with the
-- places they confirmed alongside. See 20260829160000_places_not_postcodes.
update public.auditor_profile p
   set base_place_id      = (select id from public.place where name = v.base and country_code = 'GB'),
       max_travel_minutes = v.minutes,
       travel_mode        = v.mode
from (values
  ('00000000-0000-7000-8000-0000000000d2'::uuid, 'Southwark',  60, 'own_vehicle'::public.travel_mode),
  ('00000000-0000-7000-8000-0000000000d5', 'Islington',  45, 'public_transport'),
  ('00000000-0000-7000-8000-0000000000d6', 'Manchester', 45, 'own_vehicle')
) as v(user_id, base, minutes, mode)
where p.user_id = v.user_id and p.base_place_id is null;

insert into public.auditor_coverage (auditor_id, place_id, source)
select v.auditor_id, pl.id, 'derived'
from (values
  -- Dev Auditor: south and east London, plus Edinburgh for the lottery audit
  ('00000000-0000-7000-8000-0000000000d2'::uuid, 'Southwark'),
  ('00000000-0000-7000-8000-0000000000d2', 'Lambeth'),
  ('00000000-0000-7000-8000-0000000000d2', 'Lewisham'),
  ('00000000-0000-7000-8000-0000000000d2', 'Tower Hamlets'),
  ('00000000-0000-7000-8000-0000000000d2', 'Hackney'),
  ('00000000-0000-7000-8000-0000000000d2', 'Westminster'),
  ('00000000-0000-7000-8000-0000000000d2', 'Edinburgh'),
  -- Nadia overlaps on Hackney and covers the north: the assignment console has
  -- a real choice for an Islington audit and a real exclusion for a Peckham one.
  ('00000000-0000-7000-8000-0000000000d5', 'Islington'),
  ('00000000-0000-7000-8000-0000000000d5', 'Camden'),
  ('00000000-0000-7000-8000-0000000000d5', 'Hackney'),
  ('00000000-0000-7000-8000-0000000000d5', 'Haringey'),
  -- Tom is awaiting vetting and is the only person covering the north-west
  ('00000000-0000-7000-8000-0000000000d6', 'Manchester'),
  ('00000000-0000-7000-8000-0000000000d6', 'Salford'),
  ('00000000-0000-7000-8000-0000000000d6', 'Trafford'),
  ('00000000-0000-7000-8000-0000000000d6', 'Stockport')
) as v(auditor_id, place_name)
join public.place pl on pl.name = v.place_name and pl.country_code = 'GB'
where not exists (
  select 1 from public.auditor_coverage c
  where c.auditor_id = v.auditor_id and c.place_id = pl.id
);

insert into public.auditor_capability (auditor_id, audit_type)
select v.auditor_id, v.t from (values
  ('00000000-0000-7000-8000-0000000000d2'::uuid, 'street'::public.audit_type),
  ('00000000-0000-7000-8000-0000000000d2', 'door_to_door'),
  ('00000000-0000-7000-8000-0000000000d2', 'private_site'),
  ('00000000-0000-7000-8000-0000000000d2', 'lottery'),
  -- Not signed off for lottery: an audit of that type shows CAPABLE excluding
  -- somebody, which is the whole point of the six eligibility sets.
  ('00000000-0000-7000-8000-0000000000d5', 'street'),
  ('00000000-0000-7000-8000-0000000000d5', 'door_to_door'),
  ('00000000-0000-7000-8000-0000000000d6', 'street')
) as v(auditor_id, t)
where not exists (
  select 1 from public.auditor_capability k
  where k.auditor_id = v.auditor_id and k.audit_type = v.t
);

-- ---------------------------------------------------------------------------
-- Credits. One purchase to draw everything else from, so the ledger reconciles.
--
-- The id is fixed because every reservation below names it as its
-- `source_purchase_id` — that is how a charity can be told what a given audit
-- actually cost them.
-- ---------------------------------------------------------------------------
insert into public.credit_transaction
  (id, organisation_id, delta, reason, unit_price_minor_units, note, occurred_at)
select '00000000-0000-7000-8000-00000000f001', '00000000-0000-7000-8000-0000000000c1',
       12, 'purchase', 17500, 'Local development seed', now() - interval '70 days'
where not exists (
  select 1 from public.credit_transaction where id = '00000000-0000-7000-8000-00000000f001'
);

insert into public.credit_transaction
  (id, organisation_id, delta, reason, unit_price_minor_units, note, occurred_at)
select '00000000-0000-7000-8000-00000000f002', '00000000-0000-7000-8000-0000000000c2',
       3, 'purchase', 17500, 'Local development seed', now() - interval '30 days'
where not exists (
  select 1 from public.credit_transaction where id = '00000000-0000-7000-8000-00000000f002'
);

-- ---------------------------------------------------------------------------
-- One audit in every state the pipeline has.
--
-- a01 booked, nobody offered it   S4.2 assignment console has work to do
-- a02 booked, offered             S2.1/S1.3 an offer to accept or decline
-- a03 assigned, in two days       S5.3 next audit · S1.4 prep
-- a04 assigned, next week         S5.3 coming up
-- a05 in progress                 S1.5b session · S1.6 write-up due
-- a06 in review                   S1.7 review queue · S5.3 with PICK
-- a07 released, unpaid            S1.8 client report · S5.3 cleared · S4.7 payable
-- a08 released, paid              S2.6 earnings · S5.3 paid, with a reference
-- a09 no team present             S2.7 · a credit handed back
-- a10 released, other charity     tenant isolation is visible, not assumed
-- ---------------------------------------------------------------------------
insert into public.audit (
  id, reference, client_organisation_id, auditor_id, status, audit_type, postcode,
  window_start_on, window_end_on, auditor_fee_minor_units, created_by,
  campaign_name, site_name, requires_review,
  submitted_at, completed_at, released_at, released_by, no_team_present_at,
  session_started_at, session_ended_at, pitch_detail
)
select * from (values
  ('00000000-0000-7000-8000-00000000a001'::uuid, 'PS-000901', '00000000-0000-7000-8000-0000000000c1'::uuid,
   null::uuid, 'booked'::public.audit_status, 'street'::public.audit_type, 'N1 6AH',
   current_date + 12, current_date + 14, 10000, '00000000-0000-7000-8000-0000000000d1'::uuid,
   'Winter appeal', 'Angel Islington', true,
   null::timestamptz, null::timestamptz, null::timestamptz, null::uuid, null::timestamptz,
   null::timestamptz, null::timestamptz, 'Outside the tube, north entrance'),

  ('00000000-0000-7000-8000-00000000a002', 'PS-000902', '00000000-0000-7000-8000-0000000000c1',
   null, 'booked', 'street', 'SE15 4QL',
   current_date + 6, current_date + 8, 10000, '00000000-0000-7000-8000-0000000000d1',
   'Winter appeal', 'Peckham high street', true,
   null, null, null, null, null, null, null, 'By the library'),

  ('00000000-0000-7000-8000-00000000a003', 'PS-000903', '00000000-0000-7000-8000-0000000000c1',
   '00000000-0000-7000-8000-0000000000d2', 'assigned', 'street', 'SE15 4QL',
   current_date + 2, current_date + 4, 11500, '00000000-0000-7000-8000-0000000000d1',
   'Winter appeal', 'Rye Lane', true,
   null, null, null, null, null, null, null, 'Rye Lane, outside the station'),

  ('00000000-0000-7000-8000-00000000a004', 'PS-000904', '00000000-0000-7000-8000-0000000000c1',
   '00000000-0000-7000-8000-0000000000d2', 'assigned', 'door_to_door', 'E8 3DL',
   current_date + 9, current_date + 11, 12500, '00000000-0000-7000-8000-0000000000d1',
   'Regular giving', 'Hackney residential', true,
   null, null, null, null, null, null, null, 'Residential streets off Mare Street'),

  ('00000000-0000-7000-8000-00000000a005', 'PS-000905', '00000000-0000-7000-8000-0000000000c1',
   '00000000-0000-7000-8000-0000000000d2', 'in_progress', 'street', 'SW9 8PS',
   current_date - 1, current_date + 1, 11500, '00000000-0000-7000-8000-0000000000d1',
   'Winter appeal', 'Brixton', true,
   null, null, null, null, null, now() - interval '2 hours', null, 'Outside the market'),

  ('00000000-0000-7000-8000-00000000a006', 'PS-000906', '00000000-0000-7000-8000-0000000000c1',
   '00000000-0000-7000-8000-0000000000d2', 'in_review', 'street', 'E1 6AN',
   current_date - 6, current_date - 4, 11500, '00000000-0000-7000-8000-0000000000d1',
   'Winter appeal', 'Whitechapel', true,
   now() - interval '3 days', now() - interval '3 days', null, null, null,
   now() - interval '5 days', now() - interval '5 days' + interval '1 hour', 'Outside the station'),

  ('00000000-0000-7000-8000-00000000a007', 'PS-000907', '00000000-0000-7000-8000-0000000000c1',
   '00000000-0000-7000-8000-0000000000d2', 'released', 'lottery', 'EH2 2BY',
   current_date - 20, current_date - 18, 13500, '00000000-0000-7000-8000-0000000000d1',
   'Lottery recruitment', 'Princes Street', true,
   now() - interval '17 days', now() - interval '17 days', now() - interval '15 days',
   '00000000-0000-7000-8000-0000000000d3', null,
   now() - interval '19 days', now() - interval '19 days' + interval '1 hour', 'Princes Street'),

  ('00000000-0000-7000-8000-00000000a008', 'PS-000908', '00000000-0000-7000-8000-0000000000c1',
   '00000000-0000-7000-8000-0000000000d2', 'released', 'street', 'SE1 7PB',
   current_date - 45, current_date - 43, 11500, '00000000-0000-7000-8000-0000000000d1',
   'Autumn appeal', 'South Bank', true,
   now() - interval '42 days', now() - interval '42 days', now() - interval '40 days',
   '00000000-0000-7000-8000-0000000000d3', null,
   now() - interval '44 days', now() - interval '44 days' + interval '1 hour', 'South Bank'),

  ('00000000-0000-7000-8000-00000000a009', 'PS-000909', '00000000-0000-7000-8000-0000000000c1',
   '00000000-0000-7000-8000-0000000000d2', 'no_team_present', 'street', 'SW1A 1AA',
   current_date - 10, current_date - 8, 11500, '00000000-0000-7000-8000-0000000000d1',
   'Winter appeal', 'Victoria', true,
   null, now() - interval '9 days', null, null, now() - interval '9 days',
   null, null, 'Outside the station'),

  ('00000000-0000-7000-8000-00000000a010', 'PS-000910', '00000000-0000-7000-8000-0000000000c2',
   '00000000-0000-7000-8000-0000000000d5', 'released', 'street', 'EC1V 9NR',
   current_date - 30, current_date - 28, 11500, '00000000-0000-7000-8000-0000000000d4',
   'Spring appeal', 'Old Street', true,
   now() - interval '27 days', now() - interval '27 days', now() - interval '25 days',
   '00000000-0000-7000-8000-0000000000d3', null,
   now() - interval '29 days', now() - interval '29 days' + interval '1 hour', 'Old Street roundabout')
) as v(id, reference, client_organisation_id, auditor_id, status, audit_type, postcode,
       window_start_on, window_end_on, auditor_fee_minor_units, created_by,
       campaign_name, site_name, requires_review,
       submitted_at, completed_at, released_at, released_by, no_team_present_at,
       session_started_at, session_ended_at, pitch_detail)
where not exists (select 1 from public.audit where public.audit.id = v.id);

-- An open offer, so the auditor has something to accept and the offer board is
-- not empty. Expiry is in the future or the board would hide it.
insert into public.audit_offer (id, audit_id, auditor_id, outcome, match_reason, expires_at, travel_uplift_minor_units)
select '00000000-0000-7000-8000-00000000b001', '00000000-0000-7000-8000-00000000a002',
       '00000000-0000-7000-8000-0000000000d2', 'offered',
       'Covers SE · approved · signed off for street', now() + interval '46 hours', 1500
where not exists (
  select 1 from public.audit_offer where id = '00000000-0000-7000-8000-00000000b001'
);

-- The offers already taken, so accepted work has the record behind it that a
-- real acceptance would have left.
insert into public.audit_offer (audit_id, auditor_id, outcome, match_reason, responded_at)
select v.audit_id, '00000000-0000-7000-8000-0000000000d2', 'accepted', 'Seeded as accepted', now()
from (values
  ('00000000-0000-7000-8000-00000000a003'::uuid),
  ('00000000-0000-7000-8000-00000000a004'),
  ('00000000-0000-7000-8000-00000000a005'),
  ('00000000-0000-7000-8000-00000000a006'),
  ('00000000-0000-7000-8000-00000000a007'),
  ('00000000-0000-7000-8000-00000000a008'),
  ('00000000-0000-7000-8000-00000000a009')
) as v(audit_id)
where not exists (
  select 1 from public.audit_offer o
  where o.audit_id = v.audit_id and o.outcome = 'accepted'
);

-- ---------------------------------------------------------------------------
-- The ledger, matching the audits above.
--
-- Reserved at booking, consumed at release, handed back on a no-show. Written
-- out rather than generated so the arithmetic can be read: 12 purchased, 9
-- reserved, 1 handed back, so 4 available.
-- ---------------------------------------------------------------------------
-- Staggered rather than all at one instant (TND-105). Nine rows sharing a
-- timestamp appear in arbitrary order, and the running balance beside them
-- then looks wrong — on the one screen whose whole job is letting a charity
-- check our arithmetic. The oldest audit was booked longest ago.
insert into public.credit_transaction
  (organisation_id, delta, reason, audit_id, unit_price_minor_units, source_purchase_id, occurred_at)
select '00000000-0000-7000-8000-0000000000c1', -1, 'reservation', v.audit_id, 17500,
       '00000000-0000-7000-8000-00000000f001', now() - make_interval(days => v.days_ago)
from (values
  ('00000000-0000-7000-8000-00000000a008'::uuid, 50),
  ('00000000-0000-7000-8000-00000000a007', 26),
  ('00000000-0000-7000-8000-00000000a009', 16),
  ('00000000-0000-7000-8000-00000000a006', 12),
  ('00000000-0000-7000-8000-00000000a005', 8),
  ('00000000-0000-7000-8000-00000000a003', 6),
  ('00000000-0000-7000-8000-00000000a004', 5),
  ('00000000-0000-7000-8000-00000000a002', 4),
  ('00000000-0000-7000-8000-00000000a001', 3)
) as v(audit_id, days_ago)
where not exists (
  select 1 from public.credit_transaction t
  where t.audit_id = v.audit_id and t.reason = 'reservation'
);

-- Consumption does not move the balance — the credit left at reservation. It
-- records that the charity actually got the audit.
--
-- It names the reservation it settles, which the schema insists on: a
-- consumption floating free of a reservation would make "reserved but not yet
-- settled" unanswerable, and that is the number the credit position exists to
-- report. So the reservations are read back rather than guessed at.
insert into public.credit_transaction
  (organisation_id, delta, reason, audit_id, unit_price_minor_units,
   source_purchase_id, settles_transaction_id, occurred_at)
select '00000000-0000-7000-8000-0000000000c1', 0, 'consumption', r.audit_id, 17500,
       '00000000-0000-7000-8000-00000000f001', r.id, r.occurred_at + interval '5 days'
from public.credit_transaction r
where r.reason = 'reservation'
  and r.audit_id in (
    '00000000-0000-7000-8000-00000000a007',
    '00000000-0000-7000-8000-00000000a008'
  )
  and not exists (
    select 1 from public.credit_transaction t
    where t.audit_id = r.audit_id and t.reason = 'consumption'
  );

-- Nobody was there, so the charity gets the credit back. It settles the
-- reservation for the same reason a consumption does.
insert into public.credit_transaction
  (organisation_id, delta, reason, audit_id, unit_price_minor_units,
   settles_transaction_id, note, occurred_at)
select '00000000-0000-7000-8000-0000000000c1', 1, 'release', r.audit_id, 17500,
       r.id, 'No team present', r.occurred_at + interval '7 days'
from public.credit_transaction r
where r.reason = 'reservation'
  and r.audit_id = '00000000-0000-7000-8000-00000000a009'
  and not exists (
    select 1 from public.credit_transaction t
    where t.audit_id = r.audit_id and t.reason = 'release'
  );

insert into public.credit_transaction
  (organisation_id, delta, reason, audit_id, unit_price_minor_units, source_purchase_id, occurred_at)
select '00000000-0000-7000-8000-0000000000c2', -1, 'reservation', '00000000-0000-7000-8000-00000000a010',
       17500, '00000000-0000-7000-8000-00000000f002', now() - interval '30 days'
where not exists (
  select 1 from public.credit_transaction t
  where t.audit_id = '00000000-0000-7000-8000-00000000a010' and t.reason = 'reservation'
);

-- ---------------------------------------------------------------------------
-- What the auditor is owed, itemised. The uplift is never folded into a total.
-- ---------------------------------------------------------------------------
insert into public.audit_pay_item (audit_id, kind, amount_minor_units, note)
select v.audit_id, v.kind, v.amount, v.note from (values
  ('00000000-0000-7000-8000-00000000a006'::uuid, 'base', 10000, null),
  ('00000000-0000-7000-8000-00000000a006', 'travel', 1500, 'Zone 1'),
  ('00000000-0000-7000-8000-00000000a007', 'base', 12000, null),
  ('00000000-0000-7000-8000-00000000a007', 'travel', 1500, 'Edinburgh'),
  ('00000000-0000-7000-8000-00000000a008', 'base', 10000, null),
  ('00000000-0000-7000-8000-00000000a008', 'travel', 1500, null),
  -- Paid in full: the auditor travelled and waited, and a no-show is not their
  -- failure. It is `no_show` rather than `base` so earnings can say why.
  ('00000000-0000-7000-8000-00000000a009', 'no_show', 11500, 'Nobody on site'),
  ('00000000-0000-7000-8000-00000000a010', 'base', 10000, null)
) as v(audit_id, kind, amount, note)
where not exists (
  select 1 from public.audit_pay_item p where p.audit_id = v.audit_id and p.kind = v.kind
);

-- ---------------------------------------------------------------------------
-- One executed payout run, so earnings can show money that actually moved and
-- home can show a reference. a07 and a09 are deliberately left off it: they are
-- payable and unpaid, which is what S4.7 exists to work through.
-- ---------------------------------------------------------------------------
insert into public.payout_run
  (id, reference, period_start, period_end, status, total_minor_units,
   external_reference, created_by, approved_by, approved_at, executed_at)
select '00000000-0000-7000-8000-00000000e001', 'PR-00901',
       current_date - 60, current_date - 35, 'executed', 11500,
       'BACS-20260731', '00000000-0000-7000-8000-0000000000d3',
       '00000000-0000-7000-8000-0000000000d3', now() - interval '35 days', now() - interval '34 days'
where not exists (
  select 1 from public.payout_run where id = '00000000-0000-7000-8000-00000000e001'
);

insert into public.payout_line_item
  (payout_run_id, auditor_id, audit_id, amount_minor_units, description, status, external_reference)
select '00000000-0000-7000-8000-00000000e001', '00000000-0000-7000-8000-0000000000d2',
       '00000000-0000-7000-8000-00000000a008', 11500, 'PS-000908 South Bank', 'paid', 'BACS-20260731'
where not exists (
  select 1 from public.payout_line_item where audit_id = '00000000-0000-7000-8000-00000000a008'
);

-- ---------------------------------------------------------------------------
-- Findings on the audits that have been worked, so a report is not an empty
-- page and the review screen has something to review.
--
-- Deterministic rather than random: two named checks fail, everything else
-- passes. A seed that shuffles its own results makes a screenshot impossible
-- to compare against yesterday's.
-- ---------------------------------------------------------------------------
insert into public.check_result (id, audit_id, check_definition_id, auditor_id, outcome, note, occurred_at)
select
  public.uuid_generate_v7(),
  a.audit_id,
  d.id,
  '00000000-0000-7000-8000-0000000000d2',
  case when d.code in ('ASK-01', 'OPN-02') then 'fail'::public.check_outcome else 'pass' end,
  case when d.code = 'ASK-01' then 'Asked a third time after a clear no.'
       when d.code = 'OPN-02' then 'Did not say they were paid, or name the agency.'
       else null end,
  a.occurred_at
from (values
  ('00000000-0000-7000-8000-00000000a006'::uuid, now() - interval '5 days'),
  ('00000000-0000-7000-8000-00000000a007', now() - interval '19 days'),
  ('00000000-0000-7000-8000-00000000a008', now() - interval '44 days')
) as a(audit_id, occurred_at)
cross join public.check_definition d
where d.version = 1
  and not exists (
    select 1 from public.check_result r
    where r.audit_id = a.audit_id and r.check_definition_id = d.id
  );

-- ---------------------------------------------------------------------------
-- One complaint and one risk, so the screens that handle them are not empty.
--
-- The risk is the shape TND-82 exists for: PICK noticed an exposure, advised
-- the charity, and recorded what they said back. A flag nobody acted on is not
-- evidence of anything, so the advisory is seeded with it.
-- ---------------------------------------------------------------------------
insert into public.complaint (id, organisation_id, audit_id, subject, status, body, raised_by, raised_at)
select '00000000-0000-7000-8000-00000000d901', '00000000-0000-7000-8000-0000000000c1',
       '00000000-0000-7000-8000-00000000a007', 'about_audit', 'open',
       'The report says our fundraiser followed someone. We would like to see what that was based on before we act on it.',
       '00000000-0000-7000-8000-0000000000d1', now() - interval '2 days'
where not exists (
  select 1 from public.complaint where id = '00000000-0000-7000-8000-00000000d901'
);

insert into public.risk
  (id, type, severity, subject_type, subject_id, organisation_id, status, raised_by, detail, raised_at)
select '00000000-0000-7000-8000-00000000c901', 'exposure', 'medium', 'assignment',
       '00000000-0000-7000-8000-00000000a007', '00000000-0000-7000-8000-0000000000c1',
       'advised', 'system',
       'This auditor has now audited this charity three times in eight weeks and is becoming recognisable to the agency''s team.',
       now() - interval '14 days'
where not exists (
  select 1 from public.risk where id = '00000000-0000-7000-8000-00000000c901'
);

insert into public.risk_advisory (risk_id, advised_by, channel, content, client_response, responded_at)
select '00000000-0000-7000-8000-00000000c901', '00000000-0000-7000-8000-0000000000d3', 'email',
       'Flagged to the charity that repeat visits from the same auditor weaken the independence of the finding. They asked us to proceed for this booking and rotate afterwards.',
       'proceeded', now() - interval '13 days'
where not exists (
  select 1 from public.risk_advisory where risk_id = '00000000-0000-7000-8000-00000000c901'
);

-- ---------------------------------------------------------------------------
-- Each audit's place. Matching joins on this; the postcode is now just the
-- address as written.
-- ---------------------------------------------------------------------------
update public.audit a
   set place_id = (select id from public.place where name = v.place_name and country_code = 'GB')
from (values
  ('00000000-0000-7000-8000-00000000a001'::uuid, 'Islington'),
  ('00000000-0000-7000-8000-00000000a002', 'Southwark'),
  ('00000000-0000-7000-8000-00000000a003', 'Southwark'),
  ('00000000-0000-7000-8000-00000000a004', 'Hackney'),
  ('00000000-0000-7000-8000-00000000a005', 'Lambeth'),
  ('00000000-0000-7000-8000-00000000a006', 'Tower Hamlets'),
  ('00000000-0000-7000-8000-00000000a007', 'Edinburgh'),
  ('00000000-0000-7000-8000-00000000a008', 'Southwark'),
  ('00000000-0000-7000-8000-00000000a009', 'Westminster'),
  ('00000000-0000-7000-8000-00000000a010', 'Islington')
) as v(audit_id, place_name)
where a.id = v.audit_id and a.place_id is null;
