import { color } from '@picksel/tokens';
import Link from 'next/link';
import { Chrome } from '@/components/Chrome';
import { hairline } from '@/lib/theme';

/**
 * Where a wrong URL, a stale link or somebody else's audit id lands.
 *
 * Deliberately session-free: it renders for a signed-out visitor as well as a
 * signed-in one, so it cannot itself fail. That is also why it says "cannot
 * find" rather than "does not exist" — RLS makes another charity's audit
 * indistinguishable from a missing one, which is correct, and the copy must
 * not confirm that a record exists.
 */
export default function NotFound() {
  return (
    <Chrome>
      <div style={{ padding: '60px 32px', maxWidth: 560 }}>
        <h1 style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.03em', margin: 0 }}>
          We cannot find that page
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: color.bodyBrown }}>
          The link may be out of date, or the page may belong to another organisation. Nothing has
          gone wrong with your account.
        </p>
        <div
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: hairline,
            display: 'flex',
            gap: 20,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <Link href="/audits" style={{ color: color.link, textDecoration: 'none' }}>
            Your audits
          </Link>
          <Link href="/book" style={{ color: color.link, textDecoration: 'none' }}>
            Book an audit
          </Link>
        </div>
      </div>
    </Chrome>
  );
}
