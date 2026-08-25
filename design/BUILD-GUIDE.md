# PICKsel — build guide

Committed from the Claude Design handoff package (was `handoff/CLAUDE.md`).
Renamed so it does not shadow the repo root `CLAUDE.md`; the root file links here.

PICKsel: mystery-shopping ("audit") marketplace for UK face-to-face charity fundraising,
run by PICK Auditing. Clients (charities) buy credits and book audits; contractor
auditors get offers, observe a fundraising shift covertly, write up; PICK reviews and
releases reports.

## Stack
- Web (client portal + PICK admin): Next.js (App Router), TypeScript.
- Auditor app: React Native (TypeScript).
- Shared: design/tokens/tokens.ts is the only styling source. No other colors/fonts.

## Design source of truth
design/manifest.md maps stable screen IDs (S1.1…S3.6) to mockups in design/mockups/.
Build EXACTLY what the mockup shows. When a new design drop lands, diff the manifest
version and update only the screens whose mockups changed. Reference screen IDs in
commits and PRs.

## Domain rules (non-negotiable, from design spec)
- Clients never choose the shift date within their 3+ day window; auditors accept a
  window, exact pitch revealed after accept.
- Assignment eligibility = REACHABLE ∧ APPROVED ∧ CAPABLE ∧ AVAILABLE ∧ EXPOSURE-ok ∧ NO-CONFLICT.
  Store the assignment reason. Conflict = hard block (no override); familiarity = warn + proceed.
- Audit pipeline: booked → assigned → in_progress → in_review → released.
  No-show branches: auditor paid in full, credit auto-returned, logged as no_team_present
  (never a failure).
- Check verdicts: PASS | FAIL | NOTE (never "OBS"). Free-text note attachable to any check.
- Write-up: offline-first local draft, editable per-moment until submit; PICK can return
  it unlocking only flagged moments.
- Field session: moment stepper (S1.5b) + flag sheet (S2.3). Timer/marker timestamps are
  stored data-points on the audit.
- First 3 audits per auditor are gated for PICK review.
- 1 credit = 1 audit = £175. Auditor pay £100 + travel uplift, always itemised.
- Reports: coded auditor identity (S3.4B) until the naming decision is made.
- Copy register: plain UK English, sentence case, no emoji, no exclamation marks.
  Mono ALL-CAPS for metadata labels.

## Visual rules
- Radii: 100px pill or 4-5px tile, nothing between. 1px oat hairlines; no shadows, no gradients.
- Accent color as fill needs its paired ink; accent as text uses its deep pair (see tokens).
- Field mode (in-shift) is dark navy (#041825); everything else warm bone (#F4EFE6).

## Phase 1 build scope
Foundations (schema, auth, tokens, design/ wiring) + golden path S1.1→S1.9 with the
chosen field variant S1.5b+S2.3. Phases 2-3 screens exist as mockups; stub their routes.
