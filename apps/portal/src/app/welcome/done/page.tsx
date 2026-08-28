import { color, radius } from '@picksel/tokens';
import { hairline, metaLabel, pageTitle, sans } from '@/lib/theme';

/**
 * What happens next, said plainly.
 *
 * An auditor who has just filled in a form and sees nothing will assume they
 * did it wrong. Vetting is a human step with no fixed clock, so this promises
 * a message rather than a date it cannot keep.
 */
export default function WelcomeDonePage() {
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
        <h1 style={pageTitle}>Thanks — that is everything we need</h1>
        <p style={{ ...metaLabel, textTransform: 'none' }}>
          PICK checks every auditor before offering any work: identity, right to work, and the
          methodologies you said you can run. We will be in touch when that is done.
        </p>
        <p style={{ ...metaLabel, textTransform: 'none' }}>
          There will be nothing in the app until then. That is expected, not a fault.
        </p>
      </div>
    </main>
  );
}
