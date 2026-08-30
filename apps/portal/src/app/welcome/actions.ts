'use server';

import { auditorApplication } from '@picksel/core';
import { redirect } from 'next/navigation';
import type { ApplicationState } from '@/components/AuditorApplicationForm';
import { supabaseServer } from '@/lib/supabase';

/**
 * The places within reach of a starting point.
 *
 * A thin wrapper over `places_within_reach` so the geometry stays in the
 * database and the form can ask for a new proposal as the auditor changes
 * their mind. Read-only, scoped by the caller's own session, and it proposes
 * — what gets stored is whatever they confirm.
 */
export async function proposePlaces(
  basePlaceId: string,
  minutes: number,
  mode: string,
): Promise<{ id: string; name: string; minutes: number }[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc('places_within_reach', {
    p_place_id: basePlaceId,
    p_minutes: minutes,
    p_mode: mode as never,
  });
  return (data ?? []).map((row) => ({
    id: row.place_id,
    name: row.name,
    minutes: Math.round(row.minutes),
  }));
}

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
    base_place_id: form.get('base_place_id'),
    max_travel_minutes: form.get('max_travel_minutes'),
    travel_mode: form.get('travel_mode'),
    // The places the auditor confirmed. The circle proposed them; this is what
    // they agreed to, and it is what gets stored.
    place_ids: form.getAll('place_ids').map(String),
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
    p_base_place_id: parsed.data.base_place_id,
    p_minutes: parsed.data.max_travel_minutes,
    p_mode: parsed.data.travel_mode,
    p_place_ids: parsed.data.place_ids,
    p_audit_types: parsed.data.audit_types,
    p_av_capable: parsed.data.av_capable,
  });

  if (error) return { error: error.message };

  redirect('/welcome/done');
}
