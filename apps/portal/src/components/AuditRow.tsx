import { color, radius } from '@picksel/tokens';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { bodyText, hairline, metaLabel } from '@/lib/theme';

/**
 * One audit on the charity's list.
 *
 * The row is the same shape in all four groups so the eye can run down them:
 * a short state word in the gutter, what and where in the middle, and the one
 * fact that group cares about on the right. Only the "ready" group ever puts
 * an action there.
 */
export interface AuditRowProps {
  href: string;
  /** "Being checked", "Booked" — the gutter word. Not the status enum. */
  state: string;
  /** "Lottery · Princes Street EH2" */
  title: string;
  /** "Audited Sat 8 August · released Wed 12 August" */
  subtitle: string;
  /** The right-hand fact, or an action. */
  trailing?: ReactNode;
  /** Draws the gutter word in the tone that group carries. */
  tone?: 'neutral' | 'progress' | 'good' | 'attention';
}

const TONE = {
  neutral: color.muted,
  progress: color.auditingText,
  good: color.teal,
  attention: color.creativeText,
} as const;

export function AuditRow({ href, state, title, subtitle, trailing, tone = 'neutral' }: AuditRowProps) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        padding: '13px 18px',
        background: color.paper,
        border: hairline,
        borderRadius: radius.tile,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <span style={{ ...metaLabel, color: TONE[tone], width: 104, flex: 'none' }}>{state}</span>
      <span style={{ flexGrow: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
          {title}
        </span>
        <span style={{ ...bodyText, display: 'block', fontSize: 12.5 }}>{subtitle}</span>
      </span>
      {trailing ? (
        <span style={{ flex: 'none', textAlign: 'right', ...bodyText, fontSize: 12.5 }}>
          {trailing}
        </span>
      ) : null}
    </Link>
  );
}
