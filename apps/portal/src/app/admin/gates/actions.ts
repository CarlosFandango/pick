'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';

export interface GateState {
  error?: string;
}

/**
 * Turn a gate on or off, or change what it holds.
 *
 * Deliberately not a rule editor. The triggers are a fixed enum and adding one
 * means shipping code — a generic expression evaluator would be more complex
 * than the tiers it replaced and would be configured once, then never
 * understood. What is editable here is whether a gate applies and how hard.
 */
export async function updateGate(_previous: GateState, form: FormData): Promise<GateState> {
  await requireRole('pick_admin');

  const supabase = await supabaseServer();
  const trigger = String(form.get('trigger') ?? '');

  // One field per submit: each control is its own form, so exactly one of
  // these is present and the update says only what changed.
  const enabled = form.get('enabled');
  const mode = form.get('mode');
  const scope = form.get('scope');

  const patch = {
    ...(enabled === null ? {} : { enabled: enabled === 'true' }),
    ...(mode ? { mode: String(mode) as 'auto_approve' | 'notify' | 'hold' } : {}),
    ...(scope ? { scope: String(scope) as 'payment' | 'client_release' | 'both' } : {}),
  };

  const { error } = await supabase
    .from('review_gate')
    .update(patch)
    .eq('trigger', trigger as never);

  if (error) return { error: error.message };

  revalidatePath('/admin/gates');
  return {};
}
