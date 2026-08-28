import { color, radius } from '@picksel/tokens';
import { redirect } from 'next/navigation';
import { AuditorApplicationForm } from '@/components/AuditorApplicationForm';
import { supabaseServer } from '@/lib/supabase';
import { hairline, metaLabel, pageTitle, sans } from '@/lib/theme';
import { completeProfile } from './actions';

/**
 * S5.2 — the first thing a new auditor sees.
 *
 * Not behind `requireRole`: the role gate redirects anyone without a finished
 * profile, which is everyone who legitimately arrives here. The check is done
 * by hand instead, and the database refuses the write regardless — this page
 * cannot grant anything `complete_auditor_profile` would not.
 */
export default async function WelcomePage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in');

  const { data: profile } = await supabase
    .from('user_profile')
    .select('role, status, email')
    .eq('id', user.id)
    .maybeSingle();

  // Already accepted, or never an auditor. Either way there is nothing to do
  // here, and a second visit should not look like a form waiting to be filled.
  if (!profile || profile.role !== 'auditor') redirect('/sign-in');
  if (profile.status !== 'invited') redirect('/welcome/done');

  return (
    <main
      style={{
        minHeight: '100vh',
        background: color.bone,
        fontFamily: sans,
        color: color.ink,
        padding: 24,
        display: 'grid',
        placeItems: 'start center',
      }}
    >
      <div
        style={{
          background: color.paper,
          border: hairline,
          borderRadius: radius.tile,
          padding: 34,
          maxWidth: 560,
          width: '100%',
          marginTop: 40,
        }}
      >
        <h1 style={pageTitle}>Welcome to PICK</h1>
        <p style={{ ...metaLabel, textTransform: 'none', marginBottom: 26 }}>
          A few things about where you work, so we only send you audits you can actually reach.
        </p>

        <AuditorApplicationForm action={completeProfile} email={profile.email} />
      </div>
    </main>
  );
}
