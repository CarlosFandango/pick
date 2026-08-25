'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';

export interface OfferState {
  error?: string;
  offered?: number;
}

export async function offerToEligible(_prev: OfferState, form: FormData): Promise<OfferState> {
  await requireRole('pick_admin');
  const auditId = String(form.get('auditId'));

  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('offer_audit', { p_audit_id: auditId });
  if (error) return { error: error.message };

  revalidatePath(`/admin/assignment/${auditId}`);
  return { offered: typeof data === 'number' ? data : 0 };
}
