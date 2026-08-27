'use server';

import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase';

/**
 * Ends the session and clears the cookie.
 *
 * A form POST, never a link: a GET that signs someone out can be fired by an
 * image tag on any other site, and link prefetchers follow hrefs. This file
 * exists on its own because a `'use server'` module exposes every export as a
 * callable endpoint, and `requireSession`/`requireRole` must not become one.
 */
export async function signOut(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect('/sign-in');
}
