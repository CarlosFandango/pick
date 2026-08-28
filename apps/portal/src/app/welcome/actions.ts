'use server';

import { auditorApplication } from '@picksel/core';
import { redirect } from 'next/navigation';
import type { ApplicationState } from '@/components/AuditorApplicationForm';
import { supabaseServer } from '@/lib/supabase';

/**
 * Accepting an invitation.
 *
 * Runs as the signed-in invitee, not the service role: `complete_auditor_profile`
 * decides for itself whether the caller is an auditor with an unused
 * invitation, so the rule is in one place and is exercised by `pnpm test:rls`.
 * Nothing here could grant anything the database would not.
 */
export async function completeProfile(
  _previous: ApplicationState,
  form: FormData,
): Promise<ApplicationState> {
  const supabase = await supabaseServer();

  const parsed = auditorApplication.safeParse({
    full_name: form.get('full_name'),
    base_postcode: form.get('base_postcode'),
    // A comma-separated field is what a person actually types. Splitting here
    // rather than asking them to add rows one at a time.
    areas: String(form.get('areas') ?? '')
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean),
    audit_types: form.getAll('audit_types').map(String),
    av_capable: form.get('av_capable') === 'yes',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
  }

  const password = String(form.get('password') ?? '');
  if (password) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
  }

  const { error } = await supabase.rpc('complete_auditor_profile', {
    p_full_name: parsed.data.full_name,
    p_base_postcode: parsed.data.base_postcode,
    p_areas: parsed.data.areas,
    p_audit_types: parsed.data.audit_types,
    p_av_capable: parsed.data.av_capable,
  });

  if (error) return { error: error.message };

  redirect('/welcome/done');
}
