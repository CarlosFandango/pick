# PICKsel Design Manifest
version: 1.0.0
updated: 2026-08-25T17:14:16.993Z
source: Claude Design project "UI mockups and scoping"

Screen IDs are stable. Reference them in commits, PRs and feedback ("update S2.3").
Mockups are plain HTML with inline styles — open in a browser or read directly.

## Phase 1 — Golden Path (PICKsel Phase 1 - Golden Path.dc.html)
| ID | Screen | Persona | Platform | Route (proposed) |
|---|---|---|---|---|
| S1.1 | Book an audit (wizard) | Client | Web | /book |
| S1.2 | Assignment rules (concept, not a screen) | System | — | — |
| S1.3 | Job offer | Auditor | App | OfferDetail |
| S1.4 | Prep / flashcards | Auditor | App | Prep |
| S1.5a | Field session — marker only | Auditor | App | FieldSession (variant A) |
| S1.5b | Field session — moment stepper | Auditor | App | FieldSession (variant B, CHOSEN + flag sheet S2.3) |
| S1.5c | Field session — check-level | Auditor | App | FieldSession (variant C, parked) |
| S1.6 | Write-up (editable, PASS/FAIL/NOTE) | Auditor | App | WriteUp |
| S1.7 | Review queue — held audit | PICK admin | Web | /admin/review/:id |
| S1.8 | Client report | Client | Web | /reports/:id |
| S1.9 | Client dashboard | Client | Web | /audits |

## Phase 2 — Auditor's World (PICKsel Phase 2 - Auditors World.dc.html)
| ID | Screen | Platform | Route (proposed) |
|---|---|---|---|
| S2.1 | Offers list (new/expiring/filled) | App | Offers |
| S2.2 | Accept + conflict declaration | App | OfferAccept |
| S2.3 | Field FLAG sheet (severity: wrong/note/fine) | App | FieldSession flag sheet |
| S2.4 | Write-up returned for rework | App | WriteUp (returned state) |
| S2.5 | My audits (incl. NO TEAM PRESENT status) | App | MyAudits |
| S2.6 | Earnings (itemised uplift, payout runs) | App | Earnings |
| S2.7 | No-show flow (wait timer → report → confirmation) | App | NoShow A/B/C |

## Phase 3 — Client's World (PICKsel Phase 3 - Clients World.dc.html)
| ID | Screen | Platform | Route (proposed) |
|---|---|---|---|
| S3.1 | Booking deepened (A/V toggle, window rules, 0-credit edge) | Web | /book |
| S3.2 | Auditor override picker (conflict=blocked, familiarity=warn) | Web | /book/choose-auditor |
| S3.3 | Audit list + detail (pipeline rail, no-show case) | Web | /audits, /audits/:id |
| S3.4 | Report header — named vs coded auditor (DECISION PENDING) | Web | /reports/:id |
| S3.5 | Credits & invoices (ledger) | Web | /credits |
| S3.6 | Complaint fork (about audit vs about fundraiser) | Web | /complaint |

## Phase 4 — Ops cockpit (no mockup — designed in code)

There is no Phase 4 `.dc.html`. S4.1 and S4.2 were designed in code and their
file-header comments are the spec; the same applies below. Screen IDs are still
the shared vocabulary, so they are allocated here.

| ID | Screen | Platform | Route |
|---|---|---|---|
| S4.1 | Ops home — the queue, not a dashboard | Web | /admin |
| S4.2 | Assignment console — the algorithm shows its work | Web | /admin/assignment/:id |
| S4.3 | Auditor roster — vetting, coverage, capability | Web | /admin/auditors |
| S4.4 | Audit situation report | Web | /admin/audits/:id |
| S4.5 | Clients — roster, balances, credit adjustments | Web | /admin/clients |
| S4.6 | Complaint triage | Web | /admin/complaints/:id (waits for TND-80) |
| S4.7 | Payout runs | Web | /admin/payouts (waits for TND-81) |

## Open decisions
- S3.4: auditor named vs coded in client reports — build coded (B) first; naming is additive.
- S1.5: field density — build 5B + S2.3 flag sheet; 5C parked.
