'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';

export interface ComplaintState {
  error?: string;
}

/**
 * Move a complaint along. Acknowledge, then resolve with an outcome.
 *
 * Deliberately the status lifecycle that already exists in the schema and
 * nothing more. TND-80 adds triage — three paths, a PICK-authored rework
 * instruction, and the rule that a client's raw text is never forwarded to an
 * auditor. Those are new entities beside this one, not a replacement for it,
 * so this screen is additive rather than throwaway.
 */
export async function updateComplaint(
  _previous: ComplaintState,
  form: FormData,
): Promise<ComplaintState> {
  await requireRole('pick_admin');

  const id = String(form.get('complaintId') ?? '');
  const status = String(form.get('status') ?? '');
  const resolution = String(form.get('resolution') ?? '').trim();

  if (status === 'resolved' && !resolution) {
    return { error: 'Say how it was resolved. The charity will be told this.' };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('complaint')
    .update({
      status: status as 'acknowledged' | 'resolved',
      acknowledged_at: status === 'acknowledged' ? new Date().toISOString() : undefined,
      resolved_at: status === 'resolved' ? new Date().toISOString() : undefined,
      resolution: status === 'resolved' ? resolution : undefined,
    })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath(`/admin/complaints/${id}`);
  revalidatePath('/admin');
  return {};
}
