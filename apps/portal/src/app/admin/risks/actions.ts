'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';

export interface AdvisoryState {
  error?: string;
}

/**
 * Record that PICK told the client, and what they said back.
 *
 * The half that makes the register worth keeping. A flag nobody acted on is
 * not evidence of anything — the defensible position is "we flagged it, we
 * advised you, you chose to proceed", and that needs both halves written down
 * with their own timestamps.
 */
export async function adviseOnRisk(
  _previous: AdvisoryState,
  form: FormData,
): Promise<AdvisoryState> {
  await requireRole('pick_admin');

  const content = String(form.get('content') ?? '').trim();
  if (!content) return { error: 'Say what the client was told.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('advise_on_risk', {
    p_risk_id: String(form.get('riskId') ?? ''),
    p_content: content,
    p_channel: String(form.get('channel') || 'email'),
  });

  if (error) return { error: error.message };

  revalidatePath('/admin/risks');
  return {};
}

/** What the client said when they were advised. */
export async function recordResponse(
  _previous: AdvisoryState,
  form: FormData,
): Promise<AdvisoryState> {
  await requireRole('pick_admin');

  const response = String(form.get('response') ?? '');
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from('risk_advisory')
    .update({
      client_response: response as 'proceeded' | 'withdrew' | 'no_response',
      responded_at: new Date().toISOString(),
    })
    .eq('id', String(form.get('advisoryId') ?? ''));

  if (error) return { error: error.message };

  revalidatePath('/admin/risks');
  return {};
}
