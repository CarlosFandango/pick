import { color } from '@picksel/tokens';
import Link from 'next/link';

/**
 * The way out of a detail page.
 *
 * Deliberately a link to a known place rather than `router.back()`: history is
 * not a model of where someone thinks they are. Booking redirects to
 * `/audits?booked=…`, so "back" from a report reached that way lands on a
 * success banner for an audit they have already read.
 */
export function BackLink({
  href,
  label,
  tone = 'light',
}: {
  href: string;
  label: string;
  /** `dark` for the navy admin shell, where body colours are unreadable. */
  tone?: 'light' | 'dark';
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
        fontWeight: 600,
        textDecoration: 'none',
        color: tone === 'dark' ? color.onDarkMuted : color.link,
      }}
    >
      <span aria-hidden>←</span>
      {label}
    </Link>
  );
}
