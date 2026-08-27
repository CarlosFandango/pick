import { color, fontSize, fontWeight } from '@picksel/tokens';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { signOut } from '@/lib/sign-out';
import { hairline, mono, sans, textButton } from '@/lib/theme';

/**
 * The portal shell from S1.1: wordmark, three tabs, credits, organisation.
 *
 * Credits are always visible — the design note on S1.1 is explicit that the
 * count never leaves the screen, because it is what a booking spends.
 */
export function Chrome({
  active,
  organisationName,
  credits,
  children,
}: {
  active?: 'book' | 'audits' | 'credits';
  /** Absent where there is no session to read it from — see `not-found.tsx`. */
  organisationName?: string;
  credits?: number;
  children: ReactNode;
}) {
  // Three, as S1.1 shows. A fourth "Reports" tab pointed at /reports, which the
  // design does not have and this app has never built — reports are reached
  // from the audit they belong to (S1.9 → S1.8), which is the only place a
  // client knows which report they want.
  const tabs = [
    { key: 'book', label: 'Book', href: '/book' },
    { key: 'audits', label: 'Audits', href: '/audits' },
    { key: 'credits', label: 'Credits', href: '/credits' },
  ] as const;

  return (
    <div style={{ minHeight: '100vh', background: color.bone, fontFamily: sans, color: color.ink }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          padding: '14px 32px',
          background: color.paper,
          borderBottom: hairline,
        }}
      >
        <div
          style={{
            fontWeight: fontWeight.extrabold,
            fontSize: fontSize.md,
            letterSpacing: '0.1em',
          }}
        >
          PICKSEL
        </div>
        <nav
          style={{
            display: 'flex',
            gap: 22,
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
          }}
        >
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              style={{
                color: tab.key === active ? color.ink : color.bodyBrown,
                textDecoration: 'none',
                borderBottom:
                  tab.key === active ? `2px solid ${color.teal}` : '2px solid transparent',
                paddingBottom: 2,
              }}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          {credits === undefined ? null : (
            <span
              style={{
                fontFamily: mono,
                fontSize: fontSize.xs,
                letterSpacing: '0.1em',
                color: color.bodyBrown,
              }}
            >
              CREDITS <b style={{ color: color.ink }}>{credits}</b>
            </span>
          )}
          {organisationName ? (
            <span style={{ fontSize: fontSize.xs, color: color.muted }}>{organisationName}</span>
          ) : null}
          <form action={signOut}>
            <button type="submit" style={textButton}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
