import { color } from '@picksel/tokens';
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
  active?: 'book' | 'audits' | 'reports' | 'credits';
  /** Absent where there is no session to read it from — see `not-found.tsx`. */
  organisationName?: string;
  credits?: number;
  children: ReactNode;
}) {
  const tabs = [
    { key: 'book', label: 'Book', href: '/book' },
    { key: 'audits', label: 'Audits', href: '/audits' },
    { key: 'reports', label: 'Reports', href: '/reports' },
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
        <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.1em' }}>PICKSEL</div>
        <nav style={{ display: 'flex', gap: 22, fontSize: 13, fontWeight: 600 }}>
          {tabs.map((tab) => (
            <a
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
            </a>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          {credits === undefined ? null : (
            <span
              style={{
                fontFamily: mono,
                fontSize: 10.5,
                letterSpacing: '0.1em',
                color: color.bodyBrown,
              }}
            >
              CREDITS <b style={{ color: color.ink }}>{credits}</b>
            </span>
          )}
          {organisationName ? (
            <span style={{ fontSize: 12.5, color: color.muted }}>{organisationName}</span>
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
