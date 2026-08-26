import { describe, expect, it } from 'vitest';
import {
  type AuditRow,
  type OfferBoardRow,
  toAuditStage,
  toEarningLines,
  toMyAuditRow,
  toOfferListItem,
  toOfferView,
} from '../src/lib/adapters';

const offerRow = (over: Partial<OfferBoardRow> = {}): OfferBoardRow => ({
  offer_id: 'o1',
  audit_id: 'a1',
  audit_type: 'street',
  shift_payment_method: 'direct_debit',
  postcode_outward: 'SE15',
  window_start_on: '2026-03-03',
  window_end_on: '2026-03-05',
  requires_av: false,
  base_minor_units: 10_000,
  travel_uplift_minor_units: 1_500,
  expires_at: '2026-03-01T09:00:00.000Z',
  outcome: 'offered',
  ...over,
});

const auditRow = (over: Partial<AuditRow> = {}): AuditRow => ({
  id: 'a1',
  reference: 'PS-1001',
  status: 'released',
  audit_type: 'street',
  postcode_outward: 'SE15',
  window_start_on: '2026-03-03',
  window_end_on: '2026-03-05',
  auditor_fee_minor_units: 11_500,
  ...over,
});

describe('an offer, as an auditor reads it', () => {
  it('shows an area and never an address', () => {
    // An auditor who declines must not come away knowing where the team will
    // be. The RPC withholds pitch_detail; this asserts nothing reintroduces it.
    const item = toOfferListItem(offerRow());

    expect(item.areaLabel).toBe('SE15');
    expect(JSON.stringify(item)).not.toMatch(/station|entrance|pitch/i);
  });

  it('separates the travel uplift from the fee, rather than folding it in', () => {
    const item = toOfferListItem(offerRow());
    expect(item.baseMinorUnits).toBe(10_000);
    expect(item.travelMinorUnits).toBe(1_500);
  });

  it('itemises the pay shown before accepting', () => {
    // Quoted from the offer rather than audit_pay_item, which does not exist
    // until the offer is taken — and the total must not change afterwards.
    const view = toOfferView(offerRow());
    expect(view.pay).toEqual([
      { label: 'audit', minorUnits: 10_000 },
      { label: 'travel uplift', minorUnits: 1_500 },
    ]);
  });

  it('leaves the uplift line out entirely when there is none', () => {
    const view = toOfferView(offerRow({ travel_uplift_minor_units: 0 }));
    expect(view.pay).toEqual([{ label: 'audit', minorUnits: 10_000 }]);
  });

  it('survives an offer with no expiry', () => {
    expect(toOfferListItem(offerRow({ expires_at: null })).expiresAt).toBeNull();
  });
});

describe('my audits', () => {
  it('titles a row with what it is and roughly where', () => {
    const row = toMyAuditRow(auditRow());
    expect(row.title).toBe('Street · SE15');
    expect(row.status).toBe('released');
  });

  it('shows no fee until one has been agreed', () => {
    expect(toMyAuditRow(auditRow({ auditor_fee_minor_units: null })).feeMinorUnits).toBeNull();
  });

  it('refuses a status the domain does not recognise', () => {
    // parseAuditStatus throws on legacy values rather than rendering something
    // meaningless — a status nobody can read is worse than a crash in a test.
    expect(() => toMyAuditRow(auditRow({ status: 'submitted' }))).toThrow();
  });
});

describe('earnings', () => {
  it('pivots pay items into one line per audit, uplift kept separate', () => {
    const lines = toEarningLines(
      [auditRow()],
      [
        { audit_id: 'a1', kind: 'base', amount_minor_units: 10_000 },
        { audit_id: 'a1', kind: 'travel', amount_minor_units: 1_500 },
      ],
      [],
    );

    expect(lines).toHaveLength(1);
    expect(lines[0]?.baseMinorUnits).toBe(10_000);
    expect(lines[0]?.travelMinorUnits).toBe(1_500);
    expect(lines[0]?.state).toBe('pending');
  });

  it('counts a no-show as ordinary earnings, not an exception', () => {
    // The auditor travelled and waited and is paid in full. Their earnings
    // should not single it out — it is not their failure.
    const lines = toEarningLines(
      [auditRow({ status: 'no_team_present' })],
      [{ audit_id: 'a1', kind: 'no_show', amount_minor_units: 11_500 }],
      [],
    );

    expect(lines[0]?.baseMinorUnits).toBe(11_500);
  });

  it('marks a line paid once it is on a payout run, and carries the reference', () => {
    const lines = toEarningLines(
      [auditRow()],
      [{ audit_id: 'a1', kind: 'base', amount_minor_units: 10_000 }],
      [{ audit_id: 'a1', status: 'paid', external_reference: 'BACS-99' }],
    );

    expect(lines[0]?.state).toBe('paid');
    expect(lines[0]?.payoutReference).toBe('BACS-99');
  });

  it('does not call a held or failed line paid', () => {
    // payout_line_status has four states and EarningLine has two. Anything
    // that is not actually paid must read as pending, never as money received.
    for (const status of ['pending', 'failed', 'held']) {
      const lines = toEarningLines(
        [auditRow()],
        [{ audit_id: 'a1', kind: 'base', amount_minor_units: 10_000 }],
        [{ audit_id: 'a1', status, external_reference: null }],
      );
      expect(lines[0]?.state, status).toBe('pending');
    }
  });

  it('shows an audit with no pay items yet as nothing earned, not as missing', () => {
    const lines = toEarningLines([auditRow()], [], []);
    expect(lines[0]?.baseMinorUnits).toBe(0);
  });
});

describe('stages from the database', () => {
  it('keeps a stage with no moment, which is the observation phase', () => {
    const stage = toAuditStage({
      sequence: 1,
      key: 'arrival',
      label: 'Arrival and setup',
      capture_mode: 'observation',
      moment: null,
      duration_hint_minutes: null,
    });

    expect(stage.moment).toBeNull();
    expect(stage.captureMode).toBe('observation');
  });
});
