import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

/**
 * Where an invitation link lands.
 *
 * Supabase hands back a one-time code; exchanging it sets the session cookie
 * and, from there, `/welcome` knows who is asking. Nothing else in the portal
 * needs this route — password sign-in never issues a code.
 *
 * A failed exchange goes to sign-in without saying why. An expired or reused
 * invite link and a forged one are indistinguishable to us, and should be
 * indistinguishable to whoever is holding it.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) return NextResponse.redirect(new URL('/sign-in', url.origin));

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) return NextResponse.redirect(new URL('/sign-in?error=1', url.origin));

  return NextResponse.redirect(new URL('/welcome', url.origin));
}
