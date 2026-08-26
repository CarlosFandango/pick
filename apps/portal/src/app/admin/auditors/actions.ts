'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';

export interface AuditorState {
  error?: string;
  done?: string;
}

/**
 * Approving is what lets an auditor be offered work at all.
 *
 * Runs as the signed-in admin, not the service role: `approve_auditor` checks
 * `app.is_admin()` itself, so the rule lives in one place and is exercised by
 * `pnpm test:rls` rather than trusted to this route.
 */
export async function approveAuditor(
  _previous: AuditorState,
  form: FormData,
): Promise<AuditorState> {
  await requireRole('pick_admin');

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('approve_auditor', {
    p_auditor_id: String(form.get('auditorId') ?? ''),
  });

  if (error) return { error: error.message };

  revalidatePath('/admin/auditors');
  revalidatePath('/admin');
  return { done: 'Approved' };
}

export async function suspendAuditor(
  _previous: AuditorState,
  form: FormData,
): Promise<AuditorState> {
  await requireRole('pick_admin');

  const reason = String(form.get('reason') ?? '').trim();
  // Duplicated from the database check only to produce a sentence rather than
  // a constraint name. The database remains the authority.
  if (!reason) return { error: 'Say why. It goes on the record.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('suspend_auditor', {
    p_auditor_id: String(form.get('auditorId') ?? ''),
    p_reason: reason,
  });

  if (error) return { error: error.message };

  revalidatePath('/admin/auditors');
  revalidatePath('/admin');
  return { done: 'Suspended' };
}
