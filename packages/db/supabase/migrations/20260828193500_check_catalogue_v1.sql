-- ---------------------------------------------------------------------------
-- The check catalogue, version 1 — moved out of seed.sql (TND-86).
--
-- This is reference data, not fixtures. `audit.check_set_version` pins an
-- audit to the catalogue it was run under, and `check_result` foreign-keys a
-- specific `check_definition.id` — so a database without these rows cannot
-- record an audit at all. Staging proved it: the hosted RLS run failed three
-- tests on an empty catalogue, because `seed.sql` runs only on a local
-- `db reset` and must never reach a hosted project (it creates dev accounts
-- with an obvious password).
--
-- `credit_bundle`, `review_gate` and the capture modes were already seeded
-- from migrations for the same reason. The catalogue was the outlier.
--
-- Every prompt is written the way an auditor would think about it in the
-- moment. `compliance_category` is bookkeeping for scoring and must never
-- appear in the field app — an auditor who knows a question is "the
-- vulnerability one" answers it differently.
--
-- Adding or changing a check means a NEW `version`, never an edit: historical
-- results have to keep meaning what they meant. `on conflict do nothing`
-- keeps this migration safe to re-run.
-- ---------------------------------------------------------------------------

-- PICK's own organisation. A singleton the platform needs before any admin
-- profile can reference it, so it belongs here rather than beside the dev
-- accounts.
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
