-- ---------------------------------------------------------------------------
-- What a charity is told a check found, and why it matters.
--
-- `prompt` is a question an auditor answers in the field: "Did the fundraiser
-- say they are paid, and name the agency employing them?". A report that
-- prints that question and a red FAIL beside it makes a fundraising director
-- do the translation themselves, on the most important line of the thing they
-- paid for.
--
-- So each check now also carries the two sentences the report actually needs:
--
--   client_finding    what happened, as a bare predicate — "Did not say they
--                     were paid, or name the agency." No subject: it is always
--                     the fundraiser, and two findings that each supply their
--                     own subject cannot be joined into the one sentence the
--                     report opens with.
--   client_rationale  why a charity should care — the consequence, in the
--                     regulator's terms rather than ours.
--
-- These live on the check, not in the report screen, because the next screen
-- to show a finding (the concern triage, the across-audits view) needs the
-- same sentence and must not reword it. One place per fact.
--
-- This is NOT a new catalogue version. `version` pins what a check TESTS, so
-- that historical results keep meaning what they meant; these columns describe
-- the same test to a different audience and change no result's meaning. A
-- reworded finding is a copy fix, not a re-scoring.
--
-- Nullable on purpose: a check added later without prose still renders, from
-- the prompt, rather than blanking the report.
-- ---------------------------------------------------------------------------

alter table public.check_definition add column client_finding text;
alter table public.check_definition add column client_rationale text;

comment on column public.check_definition.client_finding is
  'What a charity is told when this check fails, as a statement of fact. Never shown to an auditor.';
comment on column public.check_definition.client_rationale is
  'Why the failure matters, in terms a fundraising director recognises.';

update public.check_definition set
  client_finding = v.finding,
  client_rationale = v.rationale
from (values
  ('APR-01',
   'The ID badge was not visible before they approached people.',
   'A badge that appears only when asked for is the first thing a member of the public notices, and the first thing a complaint mentions.'),
  ('APR-02',
   'Worked away from the position agreed with the site.',
   'Site agreements are what keep a licence. Working off-pitch risks the permission for everyone who follows.'),
  ('APR-03',
   'Obstructed a doorway, a crossing or the pavement.',
   'Obstruction is the most common cause of a complaint from the site rather than the public, and it ends pitches.'),
  ('APR-04',
   'Did not show the agency name alongside the charity name.',
   'The public are entitled to know who is employing the person asking. Showing only the charity implies staff.'),
  ('WLK-01',
   'Stepped into someone''s path rather than letting them stop.',
   'Blocking someone''s way turns an approach into an obstruction, and is judged as pressure regardless of what was said.'),
  ('WLK-02',
   'Made physical contact, or did not keep an arm''s length.',
   'Touching a member of the public is the single fastest route to an upheld complaint and, on a bad day, to the police.'),
  ('WLK-03',
   'Continued with someone who appeared unwell, distressed or confused.',
   'The Code requires a fundraiser to disengage. This is the failure that most often becomes a news story.'),
  ('OPN-01',
   'Did not give their own name and the charity''s full name.',
   'An unnamed person asking for bank details is exactly what the public are repeatedly warned about.'),
  ('OPN-02',
   'Did not say they were paid, or name the agency.',
   'Somebody being asked for money has a right to know the person asking is employed to ask. This is the most common cause of an upheld complaint.'),
  ('OPN-03',
   'Named the charity in a way that could be mistaken for another organisation.',
   'A shortened name that resembles a better-known charity is treated as misleading, whether or not it was meant that way.'),
  ('PIT-01',
   'Exaggerated what the charity does, or made a claim nothing supports.',
   'A donor who later finds the claim untrue cancels, complains, and tells people. Accuracy costs nothing at the point of the ask.'),
  ('PIT-02',
   'Said or implied that money goes somewhere it does not.',
   'This is a misrepresentation of the charity''s own case for support, and the charity carries it, not the agency.'),
  ('PIT-03',
   'Carried on without checking the person had understood.',
   'Consent that was not understood is not consent, and it is the first thing examined when a donor disputes a payment.'),
  ('PIT-04',
   'Left the person no room to speak or walk away.',
   'A pitch delivered over someone is experienced as pressure even when every word in it is true.'),
  ('ASK-01',
   'Kept asking after a clear refusal.',
   'The Code is explicit: a clear no ends the ask. Continuing is the breach the public complain about most.'),
  ('ASK-02',
   'Used guilt, urgency or emotional pressure to get agreement.',
   'Pressure produces sign-ups that cancel within weeks, and complaints that outlive them.'),
  ('ASK-03',
   'Did not state the amount clearly, or how often it would be taken.',
   'A donor surprised by the second payment cancels and disputes the first. Clarity at the ask is what keeps the gift.'),
  ('ASK-04',
   'Did not make clear this is an ongoing commitment rather than a one-off gift.',
   'This is the single most common reason a Direct Debit is disputed with the bank rather than cancelled with the charity.'),
  ('TAB-01',
   'Took personal details before showing or reading the privacy notice.',
   'Collecting personal data without the notice is a data protection failure, and it is the charity that is the controller.'),
  ('TAB-02',
   'Left the screen in view of passers-by while entering details.',
   'Bank details visible on a street is a data breach waiting for a photograph.'),
  ('TAB-03',
   'Pre-ticked marketing preferences rather than leaving them to the person.',
   'Pre-ticked consent is not consent under UK GDPR, and every record collected that way is unusable.'),
  ('TAB-04',
   'Submitted the details without reading them back to be confirmed.',
   'An unconfirmed digit is a failed payment, a chased donor and a gift that never arrives.'),
  ('SGN-01',
   'Did not explain the Direct Debit Guarantee.',
   'The Guarantee is what makes a stranger willing to give bank details. Skipping it costs sign-ups as well as compliance.'),
  ('SGN-02',
   'Did not confirm the person was 18 or over.',
   'Signing up a minor is a safeguarding failure, and the agreement is void.'),
  ('SGN-03',
   'Did not say how to cancel, or leave any contact details.',
   'A donor who cannot find how to cancel goes to their bank, and the charity hears about it as a chargeback.'),
  ('SGN-04',
   'Did not give the person confirmation of what they had agreed to.',
   'Without confirmation there is no record either side can point to when the amount is later disputed.'),
  ('CLS-01',
   'Did not close courteously once the outcome was clear.',
   'How someone is treated after they say no is what they repeat to other people about the charity.'),
  ('CLS-02',
   'Asked again after the person had declined and moved away.',
   'A second ask after someone has walked away is pursuit, and it is judged more harshly than the first ask ever is.'),
  ('CLS-03',
   'Did not log the interaction as the agency requires.',
   'Unlogged interactions are why a charity cannot answer a complaint about one, months later.')
) as v (code, finding, rationale)
where public.check_definition.code = v.code
  and public.check_definition.version = 1;
