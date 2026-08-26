import { color } from '@picksel/tokens';
import type { ReactNode } from 'react';
import { signOut } from '@/lib/sign-out';
import { mono, sans, textButton } from '@/lib/theme';

/** The admin shell from S1.7 — navy, so nobody confuses it with the client portal. */
export function AdminChrome({
  queuePosition,
  who,
  children,
}: {
  queuePosition?: string;
  who: string;
  children: ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', background: color.bone, fontFamily: sans, color: color.ink }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          padding: '12px 28px',
          background: color.navy,
          color: color.onDark,
        }}
      >
        <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.1em' }}>PICKSEL ADMIN</span>
        {queuePosition ? (
          <span
            style={{
              fontFamily: mono,
              fontSize: 10,
              letterSpacing: '0.12em',
              color: color.onDarkMuted,
            }}
          >
            {queuePosition}
          </span>
        ) : null}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: color.onDarkMuted }}>{who}</span>
        <form action={signOut}>
          <button type="submit" style={{ ...textButton, color: color.onDarkMuted }}>
            Sign out
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
