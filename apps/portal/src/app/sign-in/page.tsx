import { color, radius } from '@picksel/tokens';
import { redirect } from 'next/navigation';
import { homeFor } from '@/lib/home';
import { supabaseServer } from '@/lib/supabase';
import { hairline, metaLabel, pillButton, sans } from '@/lib/theme';

/**
 * Scaffolding, not a designed screen.
 *
 * Auth is in Phase 1 scope ("foundations") but there is no sign-in mockup
 * until Phase 5 — Onboarding. This exists so the golden path can be walked
 * end to end; replace it wholesale when S5 lands rather than styling it now.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function signIn(form: FormData) {
    'use server';
    const supabase = await supabaseServer();
    const { data, error: failure } = await supabase.auth.signInWithPassword({
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    });
    // Never echo which half was wrong — that tells an attacker which emails exist.
    if (failure || !data.user) redirect('/sign-in?error=1');

    // Everyone used to land on /book, which is a client screen: an admin
    // signing in was bounced straight back out of it by requireRole. Send
    // people to their own work instead.
    const { data: profile } = await supabase
      .from('user_profile')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    redirect(profile ? homeFor(profile.role) : '/sign-in?error=1');
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: color.bone,
        fontFamily: sans,
        color: color.ink,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <form
        action={signIn}
        style={{
          background: color.paper,
          border: hairline,
          borderRadius: radius.tile,
          padding: 34,
          width: 'min(380px, 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.1em' }}>PICKSEL</div>
        <h1 style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em', margin: 0 }}>
          Sign in
        </h1>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={metaLabel}>Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            style={{
              border: hairline,
              borderRadius: radius.tile,
              padding: '11px 14px',
              fontSize: 13,
              fontFamily: sans,
            }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={metaLabel}>Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            style={{
              border: hairline,
              borderRadius: radius.tile,
              padding: '11px 14px',
              fontSize: 13,
              fontFamily: sans,
            }}
          />
        </label>
        {error ? (
          <p role="alert" style={{ margin: 0, fontSize: 13, color: color.creativeText }}>
            Those details did not match an account.
          </p>
        ) : null}
        <button type="submit" style={{ ...pillButton, marginTop: 4 }}>
          Sign in
        </button>
      </form>
    </main>
  );
}
