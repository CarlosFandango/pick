/**
 * Every page worth looking at, and what each one is responsible for.
 *
 * Executable rather than prose, deliberately. A markdown list of screens would
 * be a fifth register to keep in step with the code; this one drives the
 * snapshot run, so a page that is renamed or removed breaks the capture rather
 * than quietly becoming a lie.
 *
 * `state` says which seeded row makes the page non-empty. That is the part
 * worth writing down: a screen captured against an empty database is a
 * screenshot of an empty state, and reviewing it tells you nothing about the
 * design. If you add a page here, seed whatever it needs to have something on
 * it — see `packages/db/supabase/seed.sql`.
 *
 * Ids match `design/manifest.md`. Where a page has no screen ID it is
 * scaffolding or a route handler, and says so.
 */

/** Seeded audits, by the state they are in. Ids come from seed.sql. */
export const AUDIT = {
  bookedUnoffered: '00000000-0000-7000-8000-00000000a001',
  offered: '00000000-0000-7000-8000-00000000a002',
  assignedSoon: '00000000-0000-7000-8000-00000000a003',
  inProgress: '00000000-0000-7000-8000-00000000a005',
  inReview: '00000000-0000-7000-8000-00000000a006',
  released: '00000000-0000-7000-8000-00000000a007',
  paid: '00000000-0000-7000-8000-00000000a008',
  noTeamPresent: '00000000-0000-7000-8000-00000000a009',
};

export const COMPLAINT = '00000000-0000-7000-8000-00000000d901';

export const ACCOUNTS = {
  admin: 'admin@example.test',
  client: 'client@example.test',
  auditor: 'auditor@example.test',
  password: 'picksel-dev',
};

/**
 * The portal. Next.js, desktop-first — PICK admin work happens at a desk and
 * charity staff read reports on a laptop.
 */
export const PORTAL_PAGES = [
  {
    id: 'S4.1',
    name: 'ops-home',
    route: '/admin',
    as: 'admin',
    responsibility:
      'The queue, not a dashboard. Everything needing a person in one ranked list, with the action inline.',
    state: 'An unassigned audit, an open complaint, an auditor awaiting vetting, a late write-up.',
  },
  {
    id: 'S4.4',
    name: 'ops-audits',
    route: '/admin/audits',
    as: 'admin',
    responsibility: 'Every audit across every charity, and where each has got to.',
    state: 'Ten audits spanning all eight statuses.',
  },
  {
    id: 'S3.3',
    name: 'ops-audit-detail',
    route: `/admin/audits/${AUDIT.released}`,
    as: 'admin',
    responsibility: 'One audit in full: pipeline rail, findings, who ran it.',
    state: 'A released lottery audit with 29 findings, two of them failures.',
  },
  {
    id: 'S4.2',
    name: 'ops-assignment',
    route: `/admin/assignment/${AUDIT.bookedUnoffered}`,
    as: 'admin',
    responsibility:
      'Who was considered and why each was set aside. Shows the six eligibility sets doing their work.',
    state: 'A booked N1 audit; one auditor eligible, others excluded on coverage and capability.',
  },
  {
    id: 'S1.7',
    name: 'ops-review',
    route: `/admin/review/${AUDIT.inReview}`,
    as: 'admin',
    responsibility: 'One held audit, three actions: release, return for rework, void.',
    state: 'A submitted audit with findings, held by a review gate.',
  },
  {
    id: 'S4.3',
    name: 'ops-auditors',
    route: '/admin/auditors',
    as: 'admin',
    responsibility:
      'Vetting queue before directory. Also where an auditor is invited onto the network (S5.1).',
    state: 'Two approved, one awaiting vetting, one invited and never accepted.',
  },
  {
    id: 'S4.5',
    name: 'ops-clients',
    route: '/admin/clients',
    as: 'admin',
    responsibility: 'Charities, their credit balances, and manual adjustments with a reason.',
    state: 'Two charities with different balances.',
  },
  {
    id: 'S4.7',
    name: 'ops-payouts',
    route: '/admin/payouts',
    as: 'admin',
    responsibility: 'What is owed, what is drafted, what has been paid. Draft → approve → execute.',
    state: 'One executed run; two further audits payable and not yet on a run.',
  },
  {
    id: 'S4.8',
    name: 'ops-risks',
    route: '/admin/risks',
    as: 'admin',
    responsibility:
      'Identified risks and — the point of it — what PICK told the client, and what they said back.',
    state: 'An exposure risk, advised, client proceeded.',
  },
  {
    id: 'S4.9',
    name: 'ops-gates',
    route: '/admin/gates',
    as: 'admin',
    responsibility: 'What holds payment and what holds client release, resolved independently.',
    state: 'Six triggers seeded by migration.',
  },
  {
    id: 'S4.10',
    name: 'ops-stages',
    route: '/admin/stages',
    as: 'admin',
    responsibility: 'What each audit stage permits an auditor to capture. Read-only today.',
    state: 'Two stages seeded by migration, with the discretion caution on the row.',
  },
  {
    id: 'S4.6',
    name: 'ops-complaint',
    route: `/admin/complaints/${COMPLAINT}`,
    as: 'admin',
    responsibility: 'Read, acknowledge, resolve. Minimal until the triage paths land.',
    state: 'An open complaint about a released audit.',
  },
  {
    id: 'S1.9',
    name: 'client-audits',
    route: '/audits',
    as: 'client',
    responsibility: "The charity's own audits and where each has got to. Their home.",
    state: 'Nine audits belonging to St Luke’s, none from the other charity.',
  },
  {
    id: 'S1.1',
    name: 'client-book',
    route: '/book',
    as: 'client',
    responsibility: 'Book an audit: type, window, place, A/V. Spends a credit.',
    state: 'Four credits available, so the form is usable rather than blocked.',
  },
  {
    id: 'S3.5',
    name: 'client-credits',
    route: '/credits',
    as: 'client',
    responsibility: 'The ledger: purchased, reserved, consumed, released, available.',
    state: 'A purchase, nine reservations, two consumptions, one release.',
  },
  {
    id: 'S3.3',
    name: 'client-audit-detail',
    route: `/audits/${AUDIT.released}`,
    as: 'client',
    responsibility: 'One audit as the charity sees it, including the pipeline rail.',
    state: 'A released audit with findings.',
  },
  {
    id: 'S1.8',
    name: 'client-report',
    route: `/reports/${AUDIT.released}`,
    as: 'client',
    responsibility: 'The deliverable. Findings grouped by moment, auditor coded not named.',
    state: 'Two failures among 29 checks, so the report is not all green.',
  },
  {
    id: 'S3.6',
    name: 'client-complaint',
    route: '/complaint',
    as: 'client',
    responsibility: 'Raise a concern about an audit or a fundraiser.',
    state: 'Empty form; the fork between the two subjects is the design.',
  },
  {
    id: 'S5.2',
    name: 'welcome-done',
    route: '/welcome/done',
    as: 'auditor',
    responsibility:
      'What happens after accepting an invitation — and, for an approved auditor, that their work is in the app.',
    state: 'Signed in as an approved auditor.',
  },
  {
    id: '—',
    name: 'sign-in',
    route: '/sign-in',
    as: null,
    responsibility: 'Scaffolding. Not a designed screen until Phase 5 proper.',
    state: 'Signed out.',
  },
];

/**
 * The field app, over Expo web. Captured at iPhone size because that is the
 * only size it is ever used at — an auditor holds this one-handed, outdoors,
 * while watching something they cannot pause.
 */
export const FIELD_PAGES = [
  {
    id: 'S5.3',
    name: 'field-home',
    route: '/home',
    responsibility:
      'Where an auditor lands: next audit with the action that is due, what is coming, where their money has got to.',
    state: 'One assigned audit imminent, one later, two submitted at different payment stages.',
  },
  {
    id: 'S2.1',
    name: 'field-offers',
    route: '/offers',
    responsibility: 'Work on the table. Area and pay, never the pitch detail.',
    state: 'One live offer with time left on it.',
  },
  {
    id: 'S2.5',
    name: 'field-audits',
    route: '/audits',
    responsibility: 'Everything taken, and what is owed on each.',
    state: 'Seven accepted audits across the pipeline.',
  },
  {
    id: 'S2.6',
    name: 'field-earnings',
    route: '/earnings',
    responsibility: 'What has been earned, split base and travel, and what has actually been paid.',
    state: 'One paid audit with a reference; several pending.',
  },
  {
    id: 'S1.4',
    name: 'field-prep',
    route: `/audit/${AUDIT.assignedSoon}/prep`,
    responsibility: 'The brief, read on the way to a pitch. Works offline.',
    state: 'An assigned audit two days out.',
  },
  {
    id: 'S1.5b',
    name: 'field-session',
    route: `/audit/${AUDIT.inProgress}/session`,
    responsibility:
      'The live shift: stage stepper, per-stage capture. What may be captured is configuration.',
    state: 'An audit in progress.',
  },
  {
    id: 'S1.6',
    name: 'field-write-up',
    route: `/audit/${AUDIT.inProgress}/write-up`,
    responsibility: 'Verdicts grouped by moment. PASS, FAIL, NOTE — never a category.',
    state: 'An audit in progress with the full check catalogue behind it.',
  },
  {
    id: 'S2.7',
    name: 'field-no-show',
    route: `/audit/${AUDIT.assignedSoon}/no-show`,
    responsibility: 'Nobody turned up. Pays in full, hands the credit back.',
    state: 'An assigned audit.',
  },
  {
    id: 'S1.3',
    name: 'field-offer',
    route: `/offer/00000000-0000-7000-8000-00000000b001`,
    responsibility: 'One offer in full, with accept and decline.',
    state: 'The live offer.',
  },
];
