import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

/**
 * Where an invitation link lands.
 *
 * Verifies a one-time `token_hash` server-side and sets the session cookie.
 * That is the only shape that works here: Supabase's own `action_link` returns
 * the session as a URL **hash fragment**, which the browser never sends to the
 * server, so a route handler cannot read it however the redirect is set up.
 * The invite action builds the link from `hashed_token` for that reason.
 *
 * A failed verification goes to sign-in without saying why. An expired link, a
 * reused one and a forged one are indistinguishable to us, and should be
 * indistinguishable to whoever is holding it.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;

  if (!tokenHash || !type) return NextResponse.redirect(new URL('/sign-in', url.origin));

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) return NextResponse.redirect(new URL('/sign-in?error=1', url.origin));

  // Root routes by role, so an invited auditor reaches /welcome and anyone
  // else reaches their own work — no second place deciding where people go.
  return NextResponse.redirect(new URL('/', url.origin));
}
