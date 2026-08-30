# The design canvas

28 artboards across four pages — the charity's eight, the auditor's twelve,
PICK's eight, and a page explaining the pattern and listing what was invented.
This is the source these screens were built from, and it is committed here
because `design/` is where the drop lives (see CLAUDE.md) and because a canvas
that exists only inside a hosted artifact is a canvas nobody can grep.

**Open one in a browser.** Each `.dc.html` is a standalone page with inline
styles. `canvas.json` is the layout manifest: positions, page grouping, and the
sticky notes that carry the argument for each screen.

## Which artboard is which screen

| Artboard | Screen | Route |
|---|---|---|
| `ClientWelcome` | first run — **not built** | — |
| `Book` | S1.1 / S3.1 | `/book` |
| `AuditsList` | S1.9 / S3.3 | `/audits` |
| `AuditDetail` | S3.3 | `/audits/[id]` |
| `Main` | S1.8 — the report | `/reports/[id]` |
| `Concern` | S3.6 — **partly built** | `/complaint` |
| `History` | across audits — **not built** | — |
| `Credits` | S3.5 | `/credits` |
| `Invitation` | S5.2 | `/welcome` |
| `Approval` | waiting to be approved | `/welcome/done` |
| `AuditorHome` | S5.3 | field `(tabs)/home` |
| `Offers` | S2.1 | field `(tabs)/offers` |
| `Accept` | S2.2 — conflict step **not built** | field `offer/[id]` |
| `Prep` | S1.4 | field `audit/[id]/prep` |
| `Arrival` | arriving — **not built** | — |
| `Session` | S1.5b | field `audit/[id]/session` |
| `WriteUp` | S1.6 | field `audit/[id]/write-up` |
| `Rework` | S2.4 | field write-up, returned state |
| `Coverage` | S5.2, coverage half | `/welcome` |
| `CoverageModel` | explainer, not a screen | — |
| `OpsHome` | S4.1 | `/admin` |
| `Assignment` | S4.2 | `/admin/assignment/[id]` |
| `Review` | S1.7 | `/admin/review/[id]` |
| `Vetting` | S4.3 | `/admin/auditors` |
| `Triage` | S4.6 | `/admin/complaints/[id]` |
| `Payouts` | S4.7 | `/admin/payouts` |
| `Risks` | S4.8 | `/admin/risks` |
| `Clients` | S4.5 | `/admin/clients` |

## The pattern

Every screen opens with the one thing the person came for, in words rather than
a number, then lets them read down for the evidence. It only works where the
system **has** a judgement and the content **has** an order — the assignment
console fails both tests and gets a table, deliberately.

The sentence is always derived in `packages/core`, never composed in a screen.
Two screens describing the same state in different words is how a small team
stops trusting either, and it happened once already: the payouts screen shipped
a headline contradicting its own list.

## Editing these

They came out of Claude Design via the `/design` skill. To change one, edit the
file here and re-seed — the skill's helper takes these as input. The hosted
canvas is at https://claude.ai/code/artifact/ac614918-4288-463d-93f4-2803244b6e6b
and can be read back with `seed-canvas.mjs --extract` if these ever drift.
