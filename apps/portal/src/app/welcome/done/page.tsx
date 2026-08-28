import { color, radius } from '@picksel/tokens';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase';
import { hairline, metaLabel, pageTitle, sans } from '@/lib/theme';

/**
 * What happens next, said plainly.
 *
 * An auditor who has just filled in a form and sees nothing will assume they
 * did it wrong. Vetting is a human step with no fixed clock, so this promises
 * a message rather than a date it cannot keep.
 *
 * It is also where an already-onboarded auditor lands if they open the portal
 * at all — their work is in the field app, and this is the portal's only page
 * for them. So it has to tell an approved auditor something true rather than
 * leave them waiting for a message that already came.
 */
export default async function WelcomeDonePage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in');

  const { data: profile } = await supabase
    .from('auditor_profile')
    .select('approval_status')
    .eq('user_id', user.id)
    .maybeSingle();

  const approved = profile?.approval_status === 'approved';

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
      <div
        style={{
          background: color.paper,
          border: hairline,
          borderRadius: radius.tile,
          padding: 34,
          maxWidth: 460,
        }}
      >
        {approved ? (
          <>
            <h1 style={pageTitle}>You are on the network</h1>
            <p style={{ ...metaLabel, textTransform: 'none' }}>
              Your work lives in the PICK app, not here — offers, prep, the session itself and your
              write-ups are all there.
            </p>
            <p style={{ ...metaLabel, textTransform: 'none' }}>
              There is nothing else for you on this site.
            </p>
          </>
        ) : (
          <>
            <h1 style={pageTitle}>Thanks — that is everything we need</h1>
            <p style={{ ...metaLabel, textTransform: 'none' }}>
              PICK checks every auditor before offering any work: identity, right to work, and the
              methodologies you said you can run. We will be in touch when that is done.
            </p>
            <p style={{ ...metaLabel, textTransform: 'none' }}>
              There will be nothing in the app until then. That is expected, not a fault.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
