import {
  AUDIT_TYPE_LABELS,
  type AuditStage,
  type EarningLine,
  type OfferListItem,
  parseAuditStatus,
  SHIFT_PAYMENT_LABELS,
} from '@picksel/core';
import type { MyAuditRow } from '@/components/MyAuditsScreen';
import type { OfferView } from '@/components/OfferScreen';
import { offerArea, windowLabel } from '@/format/offer';

/**
 * Database rows to the shapes the screens take.
 *
 * The layer that was missing entirely: every screen is a pure function of
 * props, and nothing turned a query result into those props. It lives here
 * rather than in `packages/core` because half of it is presentation — a
 * `windowLabel` is a string for a person, not a domain fact — and here it can
 * name the local `OfferView` and `MyAuditRow` types the screens own.
 *
 * Everything is a plain function over a plain row. No client, no fetching:
 * that keeps them testable without a device or a network.
 */

/** One row of `offer_board()`. Snake case, because that is what Postgres sends. */
export interface OfferBoardRow {
  offer_id: string;
  audit_id: string;
  audit_type: keyof typeof AUDIT_TYPE_LABELS;
  shift_payment_method: keyof typeof SHIFT_PAYMENT_LABELS;
  postcode_outward: string;
  window_start_on: string;
  window_end_on: string;
  requires_av: boolean;
  base_minor_units: number;
  travel_uplift_minor_units: number;
  expires_at: string | null;
  outcome: string;
}

export function toOfferListItem(row: OfferBoardRow): OfferListItem {
  return {
    id: row.offer_id,
    auditTypeLabel: AUDIT_TYPE_LABELS[row.audit_type],
    areaLabel: offerArea(row.postcode_outward),
    windowLabel: windowLabel(new Date(row.window_start_on), new Date(row.window_end_on)),
    paymentMethodLabel: SHIFT_PAYMENT_LABELS[row.shift_payment_method],
    baseMinorUnits: Number(row.base_minor_units),
    travelMinorUnits: Number(row.travel_uplift_minor_units),
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    outcome: row.outcome as OfferListItem['outcome'],
  };
}

/**
 * The detail screen shows pay itemised BEFORE accepting, and it never changes
 * afterwards — that is the point of quoting it here rather than reading
 * `audit_pay_item`, which does not exist until the offer is taken.
 */
export function toOfferView(row: OfferBoardRow): OfferView {
  const travel = Number(row.travel_uplift_minor_units);

  return {
    auditTypeLabel: AUDIT_TYPE_LABELS[row.audit_type],
    paymentMethodLabel: SHIFT_PAYMENT_LABELS[row.shift_payment_method],
    postcodeOutward: row.postcode_outward,
    windowStart: new Date(row.window_start_on),
    windowEnd: new Date(row.window_end_on),
    expiresAt: row.expires_at ? new Date(row.expires_at) : new Date(row.window_end_on),
    pay: [
      { label: 'audit', minorUnits: Number(row.base_minor_units) },
      ...(travel > 0 ? [{ label: 'travel uplift', minorUnits: travel }] : []),
    ],
  };
}

export interface AuditRow {
  id: string;
  reference: string;
  status: string;
  audit_type: keyof typeof AUDIT_TYPE_LABELS;
  postcode_outward: string;
  window_start_on: string;
  window_end_on: string;
  auditor_fee_minor_units: number | null;
}

export function toMyAuditRow(row: AuditRow): MyAuditRow {
  return {
    id: row.id,
    title: `${AUDIT_TYPE_LABELS[row.audit_type]} · ${row.postcode_outward}`,
    dateLabel: windowLabel(new Date(row.window_start_on), new Date(row.window_end_on)),
    feeMinorUnits:
      row.auditor_fee_minor_units === null ? null : Number(row.auditor_fee_minor_units),
    status: parseAuditStatus(row.status),
  };
}

export interface PayItemRow {
  audit_id: string;
  kind: string;
  amount_minor_units: number;
}

export interface PayoutLineRow {
  audit_id: string | null;
  status: string;
  external_reference: string | null;
}

/**
 * Earnings are a pivot, not a select: `audit_pay_item` holds one row per part
 * of the fee, and the screen shows one row per audit with the parts separated,
 * because the uplift is never hidden inside a total.
 */
export function toEarningLines(
  audits: readonly AuditRow[],
  payItems: readonly PayItemRow[],
  payoutLines: readonly PayoutLineRow[],
): EarningLine[] {
  const paidFor = new Map(payoutLines.filter((l) => l.audit_id).map((l) => [l.audit_id, l]));

  return audits.map((audit) => {
    const parts = payItems.filter((p) => p.audit_id === audit.id);
    const sum = (kinds: string[]) =>
      parts
        .filter((p) => kinds.includes(p.kind))
        .reduce((total, p) => total + Number(p.amount_minor_units), 0);
    const line = paidFor.get(audit.id);

    return {
      auditId: audit.id,
      title: `${AUDIT_TYPE_LABELS[audit.audit_type]} · ${audit.postcode_outward}`,
      dateLabel: windowLabel(new Date(audit.window_start_on), new Date(audit.window_end_on)),
      // A no-show is paid at the full fee and counts as base: the auditor
      // travelled and waited, and their earnings should not read as an
      // exception for it.
      baseMinorUnits: sum(['base', 'no_show', 'adjustment']),
      travelMinorUnits: sum(['travel']),
      state: line?.status === 'paid' ? 'paid' : 'pending',
      payoutReference: line?.external_reference ?? null,
    };
  });
}

export interface StageRow {
  sequence: number;
  key: string;
  label: string;
  capture_mode: string;
  moment: string | null;
  duration_hint_minutes: number | null;
}

export function toAuditStage(row: StageRow): AuditStage {
  return {
    key: row.key,
    label: row.label,
    sequence: Number(row.sequence),
    captureMode: row.capture_mode as AuditStage['captureMode'],
    moment: row.moment as AuditStage['moment'],
    durationHintMinutes: row.duration_hint_minutes,
  };
}
