'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';

export interface PayoutState {
  error?: string;
  done?: string;
}

/** Draft a run from everything payable in the period. */
export async function buildRun(_previous: PayoutState, form: FormData): Promise<PayoutState> {
  await requireRole('pick_admin');

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('build_payout_run', {
    p_period_start: String(form.get('periodStart') ?? ''),
    p_period_end: String(form.get('periodEnd') ?? ''),
  });

  if (error) return { error: error.message };

  revalidatePath('/admin/payouts');
  return { done: 'Drafted' };
}

export async function approveRun(_previous: PayoutState, form: FormData): Promise<PayoutState> {
  await requireRole('pick_admin');

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('approve_payout_run', {
    p_run_id: String(form.get('runId') ?? ''),
  });

  if (error) return { error: error.message };

  revalidatePath('/admin/payouts');
  return {};
}

/**
 * Mark a run executed, once the money has actually moved.
 *
 * Separate from approval because it is a claim about the outside world this
 * system cannot verify. The reference is the only evidence it happened, so it
 * is required — by the database, not just by this form.
 */
export async function executeRun(_previous: PayoutState, form: FormData): Promise<PayoutState> {
  await requireRole('pick_admin');

  const reference = String(form.get('reference') ?? '').trim();
  if (!reference) return { error: 'Record the reference the payment was made under.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('execute_payout_run', {
    p_run_id: String(form.get('runId') ?? ''),
    p_external_reference: reference,
  });

  if (error) return { error: error.message };

  revalidatePath('/admin/payouts');
  return {};
}
