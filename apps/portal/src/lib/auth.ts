import type { AppRole } from '@picksel/core';
import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase';

export interface Session {
  userId: string;
  role: AppRole;
  organisationId: string | null;
  fullName: string;
}

/**
 * The one place a page learns who is asking.
 *
 * This is a gate, not a permission system: the database decides what the user
 * can actually see. Route gating just keeps people out of screens that would be
 * empty for them anyway.
 */
export async function requireSession(): Promise<Session> {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/sign-in');

  const { data: profile } = await supabase
    .from('user_profile')
    .select('id, role, organisation_id, full_name, status')
    .eq('id', auth.user.id)
    .single();

  if (!profile || profile.status === 'suspended') redirect('/sign-in');

  return {
    userId: profile.id,
    role: profile.role,
    organisationId: profile.organisation_id,
    fullName: profile.full_name,
  };
}

export async function requireRole(...allowed: AppRole[]): Promise<Session> {
  const session = await requireSession();
  if (!allowed.includes(session.role)) redirect('/');
  return session;
}
