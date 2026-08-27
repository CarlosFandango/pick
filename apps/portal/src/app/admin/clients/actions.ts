'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';

export interface AdjustState {
  error?: string;
  done?: string;
}

/**
 * Add or remove credits, with a reason.
 *
 * A new ledger row, never an edit — `adjust_credits` inserts, and UPDATE and
 * DELETE on `credit_transaction` are revoked and trigger-blocked besides. The
 * reason and the actor are both mandatory in the database: an adjustment
 * nobody can account for is indistinguishable from a mistake.
 */
export async function adjustCredits(_previous: AdjustState, form: FormData): Promise<AdjustState> {
  await requireRole('pick_admin');

  const delta = Number(form.get('delta'));
  const reason = String(form.get('reason') ?? '').trim();

  // Both duplicated from the database only to produce a sentence rather than a
  // constraint name. The database remains the authority.
  if (!Number.isInteger(delta) || delta === 0) {
    return { error: 'Give a whole number of credits, up or down.' };
  }
  if (!reason) return { error: 'Say why. It goes on the ledger permanently.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('adjust_credits', {
    p_organisation_id: String(form.get('organisationId') ?? ''),
    p_delta: delta,
    p_reason: reason,
  });

  if (error) return { error: error.message };

  revalidatePath('/admin/clients');
  return { done: `${delta > 0 ? '+' : ''}${delta} recorded` };
}
