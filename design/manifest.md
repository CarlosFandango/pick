# PICKsel Design Manifest
version: 1.0.0
updated: 2026-08-25T17:14:16.993Z
source: Claude Design project "UI mockups and scoping"

Screen IDs are stable. Reference them in commits, PRs and feedback ("update S2.3").

The mockups themselves are **not in this repository**. The `.dc.html` files named
below live in the Claude Design project this manifest was exported from. Until
they are committed here, "diff the manifest version and update only the screens
whose mockups changed" cannot be done from a checkout — which is the workflow
this file exists to make possible.

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

## Open decisions
- S3.4: auditor named vs coded in client reports — build coded (B) first; naming is additive.
- S1.5: field density — build 5B + S2.3 flag sheet; 5C parked.
