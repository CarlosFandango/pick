import { color, fontSize, fontWeight } from '@picksel/tokens';
import Link from 'next/link';
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
        <Link href="/admin" style={{ ...wordmark, textDecoration: 'none', color: color.onDark }}>
          PICKSEL ADMIN
        </Link>

        {/*
          The ops home is a queue — what needs a human today. That is right for
          it, but it left everything else unreachable: an audit booked for next
          month appeared nowhere, and nothing linked to the assignment console
          at all. These are the directories the queue is not.
        */}
        <nav
          style={{
            display: 'flex',
            gap: 16,
            fontSize: fontSize.xs,
            fontWeight: fontWeight.semibold,
          }}
        >
          {[
            { href: '/admin/audits', label: 'Audits' },
            { href: '/admin/auditors', label: 'Auditors' },
            { href: '/admin/clients', label: 'Clients' },
            { href: '/admin/payouts', label: 'Payouts' },
            { href: '/admin/risks', label: 'Risks' },
            { href: '/admin/gates', label: 'Gates' },
            { href: '/admin/stages', label: 'Stages' },
          ].map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              style={{ color: color.onDarkMuted, textDecoration: 'none' }}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {queuePosition ? (
          <span
            style={{
              fontFamily: mono,
              fontSize: fontSize.xs,
              letterSpacing: '0.12em',
              color: color.onDarkMuted,
            }}
          >
            {queuePosition}
          </span>
        ) : null}
        <span style={{ marginLeft: 'auto', fontSize: fontSize.xs, color: color.onDarkMuted }}>
          {who}
        </span>
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

const wordmark = {
  fontWeight: fontWeight.extrabold,
  fontSize: fontSize.sm,
  letterSpacing: '0.1em',
} as const;
