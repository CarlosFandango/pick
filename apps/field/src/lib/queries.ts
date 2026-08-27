import {
  type Answer,
  AUDIT_TYPE_LABELS,
  type AuditMoment,
  type AuditStage,
  type EarningLine,
  newId,
  type OfferListItem,
  type PrepCard,
  SHIFT_PAYMENT_LABELS,
  type WriteUpCheck,
} from '@picksel/core';
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
    .select(
      'sequence, key, label, capture_mode, moment, duration_hint_minutes, ' +
        'audit_capture_mode(allows_tallies, allows_notes, allows_markers)',
    )
    .eq('audit_type', auditType)
    .eq('is_active', true)
    .order('sequence');
  if (error) throw error;

  // Flatten the embed to the shape the local cache also stores, so an offline
  // read and an online read reach `toAuditStage` identically.
  const rows = (data ?? []) as unknown as (StageRow & {
    audit_capture_mode: Pick<StageRow, 'allows_tallies' | 'allows_notes' | 'allows_markers'> | null;
  })[];

  return rows
    .map(({ audit_capture_mode: mode, ...stage }) => ({
      ...stage,
      allows_tallies: mode?.allows_tallies ?? null,
      allows_notes: mode?.allows_notes ?? null,
      allows_markers: mode?.allows_markers ?? null,
    }))
    .map(toAuditStage);
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

/**
 * The check catalogue for an audit, as prep cards, plus what is already known.
 *
 * Columns are named rather than `select *` for a reason: `check_definition`
 * carries `compliance_category`, and it must never reach the device. An
 * auditor who knows a question is "the vulnerability one" answers it
 * differently, and the audit stops measuring what it claims to.
 */
export async function fetchPrep(auditId: string): Promise<{
  cards: PrepCard[];
  learntIds: Set<string>;
  kicker: string;
}> {
  const client = supabase();

  const { data: audit, error: auditError } = await client
    .from('audit')
    .select('audit_type, shift_payment_method, check_set_version')
    .eq('id', auditId)
    .single();
  if (auditError) throw auditError;

  const [checks, progress] = await Promise.all([
    client
      .from('check_definition')
      .select('id, moment, prompt, guidance, sort_order')
      .eq('version', audit.check_set_version)
      .eq('is_active', true)
      .order('sort_order'),
    client.from('prep_progress').select('check_definition_id'),
  ]);

  if (checks.error) throw checks.error;
  if (progress.error) throw progress.error;

  return {
    cards: (checks.data ?? []).map((row) => ({
      id: row.id,
      moment: row.moment,
      prompt: row.prompt,
      guidance: row.guidance,
      sortOrder: row.sort_order,
    })),
    learntIds: new Set((progress.data ?? []).map((row) => row.check_definition_id)),
    kicker: `Prep · ${AUDIT_TYPE_LABELS[audit.audit_type]} — ${SHIFT_PAYMENT_LABELS[audit.shift_payment_method]}`,
  };
}

/** No RPC: prep progress is the auditor's own row and nothing else reads it. */
export async function markCardLearnt(checkDefinitionId: string): Promise<void> {
  const { error } = await supabase()
    .from('prep_progress')
    .upsert({ check_definition_id: checkDefinitionId, auditor_id: await currentUserId() });
  if (error) throw error;
}

export async function forgetCard(checkDefinitionId: string): Promise<void> {
  const { error } = await supabase()
    .from('prep_progress')
    .delete()
    .eq('check_definition_id', checkDefinitionId);
  if (error) throw error;
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase().auth.getUser();
  if (!data.user) throw new Error('No signed-in auditor');
  return data.user.id;
}

/** The checks a write-up answers, and whatever has been answered so far. */
export async function fetchWriteUp(auditId: string): Promise<{
  checks: WriteUpCheck[];
  answers: Map<string, Answer>;
  unlockedMoments: Set<AuditMoment>;
  title: string;
}> {
  const client = supabase();

  const { data: audit, error: auditError } = await client
    .from('audit')
    .select('audit_type, postcode_outward, check_set_version, returned_moments')
    .eq('id', auditId)
    .single();
  if (auditError) throw auditError;

  const [checks, results] = await Promise.all([
    client
      .from('check_definition')
      .select('id, moment, prompt, sort_order')
      .eq('version', audit.check_set_version)
      .eq('is_active', true)
      .order('sort_order'),
    // Append-only: the current answer is the latest row per check.
    client
      .from('check_result')
      .select('check_definition_id, outcome, note, occurred_at')
      .eq('audit_id', auditId)
      .order('occurred_at', { ascending: false }),
  ]);

  if (checks.error) throw checks.error;
  if (results.error) throw results.error;

  const answers = new Map<string, Answer>();
  for (const row of results.data ?? []) {
    if (answers.has(row.check_definition_id)) continue;
    answers.set(row.check_definition_id, {
      verdict: row.outcome === 'pass' ? 'pass' : row.outcome === 'fail' ? 'fail' : 'note',
      note: row.note ?? undefined,
    });
  }

  return {
    checks: (checks.data ?? []).map((row) => ({
      id: row.id,
      moment: row.moment,
      prompt: row.prompt,
      sortOrder: row.sort_order,
    })),
    answers,
    unlockedMoments: new Set(audit.returned_moments ?? []),
    title: `${AUDIT_TYPE_LABELS[audit.audit_type]} · ${audit.postcode_outward}`,
  };
}

/**
 * Submit. Ids are minted on the device so a re-send over a flaky connection is
 * `on conflict do nothing` rather than a duplicate row.
 */
export async function submitWriteUp(
  auditId: string,
  answers: ReadonlyMap<string, Answer>,
): Promise<void> {
  const results = [...answers.entries()].map(([checkDefinitionId, answer]) => ({
    id: newId(),
    check_definition_id: checkDefinitionId,
    outcome: answer.verdict === 'note' ? 'not_observed' : answer.verdict,
    note: answer.note ?? null,
    occurred_at: new Date().toISOString(),
  }));

  const { error } = await supabase().rpc('submit_write_up', {
    p_audit_id: auditId,
    p_results: results as never,
  });
  if (error) throw error;
}

export async function reportNoTeamPresent(auditId: string, note?: string): Promise<void> {
  const { error } = await supabase().rpc('report_no_team_present', {
    p_audit_id: auditId,
    p_note: note ?? undefined,
  });
  if (error) throw error;
}
