import type { AUDIT_TYPE_LABELS, AuditStage, EarningLine, OfferListItem } from '@picksel/core';
import type { MyAuditRow } from '@/components/MyAuditsScreen';
import type { OfferView } from '@/components/OfferScreen';
import {
  type AuditRow,
  type OfferBoardRow,
  type PayItemRow,
  type PayoutLineRow,
  type StageRow,
  toAuditStage,
  toEarningLines,
  toMyAuditRow,
  toOfferListItem,
  toOfferView,
} from './adapters';
import { supabase } from './supabase';

/**
 * Every read the field app makes, in one place.
 *
 * Thin on purpose: fetch, hand the rows to an adapter, return props. All the
 * shaping is in `adapters.ts` where it is tested without a network, and all
 * the scoping is in RLS. Nothing here decides who may see what.
 */

/** The four methodologies. Narrowed from the generated enum, not restated. */
export type AuditType = keyof typeof AUDIT_TYPE_LABELS;

const AUDIT_COLUMNS =
  'id, reference, status, audit_type, postcode_outward, window_start_on, window_end_on, auditor_fee_minor_units';

export async function fetchOffers(): Promise<OfferListItem[]> {
  const { data, error } = await supabase().rpc('offer_board');
  if (error) throw error;
  return ((data ?? []) as unknown as OfferBoardRow[]).map(toOfferListItem);
}

export async function fetchOffer(offerId: string): Promise<OfferView | null> {
  const { data, error } = await supabase().rpc('offer_board');
  if (error) throw error;

  const row = ((data ?? []) as unknown as OfferBoardRow[]).find((r) => r.offer_id === offerId);
  return row ? toOfferView(row) : null;
}

export async function fetchMyAudits(): Promise<MyAuditRow[]> {
  const { data, error } = await supabase()
    .from('audit')
    .select(AUDIT_COLUMNS)
    .order('window_start_on', { ascending: false })
    .limit(50);
  if (error) throw error;
  return ((data ?? []) as unknown as AuditRow[]).map(toMyAuditRow);
}

export async function fetchEarnings(): Promise<EarningLine[]> {
  const client = supabase();
  const [audits, payItems, payoutLines] = await Promise.all([
    client.from('audit').select(AUDIT_COLUMNS).order('window_start_on', { ascending: false }),
    client.from('audit_pay_item').select('audit_id, kind, amount_minor_units'),
    client.from('payout_line_item').select('audit_id, status, external_reference'),
  ]);

  for (const result of [audits, payItems, payoutLines]) {
    if (result.error) throw result.error;
  }

  return toEarningLines(
    (audits.data ?? []) as unknown as AuditRow[],
    (payItems.data ?? []) as unknown as PayItemRow[],
    (payoutLines.data ?? []) as unknown as PayoutLineRow[],
  );
}

/**
 * The stage list for an audit type.
 *
 * Read rather than assumed, and cached locally by the caller: an auditor opens
 * this on a pitch with no signal, and a sequence they cannot read is a session
 * they cannot run.
 */
export async function fetchStages(auditType: AuditType): Promise<AuditStage[]> {
  const { data, error } = await supabase()
    .from('audit_stage_template')
    .select('sequence, key, label, capture_mode, moment, duration_hint_minutes')
    .eq('audit_type', auditType)
    .eq('is_active', true)
    .order('sequence');
  if (error) throw error;
  return ((data ?? []) as unknown as StageRow[]).map(toAuditStage);
}

export async function acceptOffer(offerId: string): Promise<void> {
  const { error } = await supabase().rpc('accept_offer', { p_offer_id: offerId });
  if (error) throw error;
}

export async function declineOffer(offerId: string, reason?: string): Promise<void> {
  const { error } = await supabase().rpc('decline_offer', {
    p_offer_id: offerId,
    p_reason: reason ?? undefined,
  });
  if (error) throw error;
}
