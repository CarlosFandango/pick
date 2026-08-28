import { redirect } from 'next/navigation';
import { homeFor } from '@/lib/home';
import { supabaseServer } from '@/lib/supabase';

/**
 * The root sends people to their own work.
 *
 * It used to be a holding page reading "Scaffold. No features yet." — which
 * would have been harmless, except `requireRole` bounces anyone out of a screen
 * that is not theirs *to here*. So the one place a confused user was sent was
 * the one page that told them nothing and offered them nowhere to go.
 *
 * Deliberately not a dashboard. Every role already has a screen that is the
 * right place to start; a landing page in front of them would be a page nobody
 * needs and everybody passes through.
 */
export default async function Root() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/sign-in');

  const { data: profile } = await supabase
    .from('user_profile')
    .select('role, status')
    .eq('id', auth.user.id)
    .maybeSingle();

  // No profile, or a suspended one: the same answer requireSession gives, and
  // for the same reason — there is nothing here for them and saying which of
  // the two it is tells an attacker something.
  if (!profile || profile.status === 'suspended') redirect('/sign-in');

  redirect(homeFor(profile.role));
}
