'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';

export interface StageState {
  error?: string;
}

/** The three things a stage can permit. Named so a typo cannot reach the update. */
const FLAGS = ['allows_tallies', 'allows_notes', 'allows_markers'] as const;
type Flag = (typeof FLAGS)[number];

/**
 * Change what a stage permits, or turn one off.
 *
 * This is the whole point of TND-83: the rule about what an auditor may do
 * mid-shift used to be a `switch` in `core/stages.ts`, so changing it needed a
 * developer. It is a row now, and this is how a person changes it.
 *
 * Deliberately not a stage *authoring* screen. Adding a stage is an insert
 * anyone with database access can do, but a new stage that no
 * `audit_stage_template` row references does nothing — creating one usefully
 * means also placing it in the sequence, and a half-built stage sitting in the
 * list is worse than not being able to make one here. When the sequence editor
 * exists, this grows a create button next to it.
 */
export async function updateStage(_previous: StageState, form: FormData): Promise<StageState> {
  await requireRole('pick_admin');

  const supabase = await supabaseServer();
  const key = String(form.get('key') ?? '');

  // One field per submit: each control is its own form, so exactly one of
  // these is present and the update says only what changed.
  const patch: Record<string, boolean> = {};
  for (const flag of FLAGS) {
    const value = form.get(flag);
    if (value !== null) patch[flag] = value === 'true';
  }
  const active = form.get('is_active');
  if (active !== null) patch.is_active = active === 'true';

  if (Object.keys(patch).length === 0) return { error: 'Nothing to change.' };

  const { error } = await supabase
    .from('audit_capture_mode')
    .update(patch as { [K in Flag]?: boolean })
    .eq('key', key);

  if (error) return { error: error.message };

  revalidatePath('/admin/stages');
  return {};
}
