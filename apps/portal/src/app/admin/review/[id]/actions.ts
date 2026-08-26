'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';

export interface ReviewState {
  error?: string;
}

/** Approve and release — the primary path off this screen. */
export async function releaseAudit(_prev: ReviewState, form: FormData): Promise<ReviewState> {
  await requireRole('pick_admin');
  const supabase = await supabaseServer();

  const { error } = await supabase.rpc('release_audit', {
    p_audit_id: String(form.get('auditId')),
  });
  if (error) return { error: error.message };

  revalidatePath('/admin');
  redirect('/admin');
}

/** Return to the auditor, unlocking only the moments that need rework. */
export async function returnToAuditor(_prev: ReviewState, form: FormData): Promise<ReviewState> {
  await requireRole('pick_admin');
  const moments = form.getAll('moment').map(String);
  if (moments.length === 0) {
    return { error: 'Choose which moments need rework.' };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('return_write_up', {
    p_audit_id: String(form.get('auditId')),
    // biome-ignore lint/suspicious/noExplicitAny: generated types model an enum array as never[]
    p_moments: moments as any,
    p_note: String(form.get('note') ?? '') || undefined,
  });
  if (error) return { error: error.message };

  revalidatePath('/admin');
  redirect('/admin');
}

/** Void it. The client did not get an audit, so their credit goes back. */
export async function voidAudit(_prev: ReviewState, form: FormData): Promise<ReviewState> {
  await requireRole('pick_admin');
  const reason = String(form.get('reason') ?? '').trim();
  if (!reason) return { error: 'Say why the audit is being voided.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('void_audit', {
    p_audit_id: String(form.get('auditId')),
    p_reason: reason,
  });
  if (error) return { error: error.message };

  revalidatePath('/admin');
  redirect('/admin');
}
