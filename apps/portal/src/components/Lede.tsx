import type { Lede as DomainLede, LedeTone } from '@picksel/core';
import { color, radius } from '@picksel/tokens';
import { bodyText, hairline, metaLabel } from '@/lib/theme';

/**
 * The three-second answer, at the top of a screen.
 *
 * Every screen in the design opens with the one thing the person came for, in
 * words rather than a number, and only then lets them read down for evidence.
 * This is that block, and it is one component because eighteen screens leading
 * with the same shape drawn eighteen ways is how the shape stops being a
 * pattern.
 *
 * The sentence itself is never composed here — it comes from `@picksel/core`,
 * so the report and the audit list cannot describe the same audit differently.
 */

/**
 * Colour never carries state on its own, so each tone has an icon as well as a
 * hue. The mark is drawn rather than lettered: an auditor or a director reading
 * this on a phone in a corridor gets the shape before the word.
 */
const TONES: Record<
  LedeTone,
  { accent: string; icon: 'warning' | 'tick' | 'clock'; label: string }
> = {
  breach: { accent: color.creativeText, icon: 'warning', label: 'Breach found' },
  attention: { accent: color.auditingText, icon: 'warning', label: 'Needs attention' },
  clear: { accent: color.teal, icon: 'tick', label: 'Nothing to act on' },
  waiting: { accent: color.muted, icon: 'clock', label: 'In progress' },
};

function Icon({ name, stroke }: { name: 'warning' | 'tick' | 'clock'; stroke: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (name === 'tick') {
    return (
      <svg {...common}>
        <title>{''}</title>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  if (name === 'clock') {
    return (
      <svg {...common}>
        <title>{''}</title>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <title>{''}</title>
      <path d="M12 8v5" />
      <circle cx="12" cy="16.5" r="0.6" fill={stroke} stroke="none" />
      <path d="M10.3 3.9 2.6 17.4a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

export interface LedeProps extends DomainLede {
  /** Anything that acts on the verdict — a button, a link. Optional. */
  children?: React.ReactNode;
  /** Smaller variant for a list row or a card, where this is not the page. */
  compact?: boolean;
}

export function Lede({ tone, meta, headline, detail, children, compact }: LedeProps) {
  const t = TONES[tone];
  return (
    <section
      style={{
        display: 'flex',
        gap: compact ? 13 : 18,
        alignItems: 'flex-start',
        padding: compact ? '16px 18px' : '24px 26px',
        background: color.paper,
        border: hairline,
        // The rule is the loudest thing on the page and the only place the tone
        // is stated at full strength.
        borderTop: `5px solid ${t.accent}`,
        borderRadius: radius.tile,
      }}
    >
      <div
        style={{
          flex: 'none',
          width: compact ? 30 : 38,
          height: compact ? 30 : 38,
          borderRadius: radius.pill,
          background: t.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={t.icon} stroke={color.bone} />
      </div>
      <div style={{ flexGrow: 1, minWidth: 0 }}>
        <div style={{ ...metaLabel, color: t.accent, marginBottom: 7 }}>
          {meta}
          {/* The tone is legible from the hue and the mark; this is how it
              reaches somebody using a screen reader. */}
          <span style={{ position: 'absolute', left: -9999 }}> — {t.label}</span>
        </div>
        <h1
          style={{
            margin: `0 0 ${detail ? 10 : 0}px`,
            fontSize: compact ? 17 : 24,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.25,
            textWrap: 'pretty',
          }}
        >
          {headline}
        </h1>
        {detail ? <p style={{ ...bodyText, margin: 0, fontSize: 14 }}>{detail}</p> : null}
        {children ? <div style={{ marginTop: 16 }}>{children}</div> : null}
      </div>
    </section>
  );
}
