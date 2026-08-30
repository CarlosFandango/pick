import { color, radius } from '@picksel/tokens';
import type { ReactNode } from 'react';
import { bodyText, hairline, metaLabel } from '@/lib/theme';

/**
 * The second half of the pattern: read down the thing in the order it happened.
 *
 * A timeline is only honest where the content genuinely has an order. Where it
 * does not — six parallel eligibility rules, a list of charities — the design
 * uses a table instead, deliberately, and this component is the wrong choice.
 * See the assignment console for the case that fails both tests.
 */

export interface SequenceStepProps {
  /** "03 Opening" — the gutter label. Position is printed by the caller. */
  label: string;
  /** The body line: what this step was. "Arriving and setting up". */
  summary?: string;
  /** A short count beside it: "4 of 4 in order". */
  note?: string;
  /** Teal for a step that passed, red for one that did not. */
  tone?: 'clear' | 'breach' | 'attention' | 'neutral';
  /** When present, the step opens into a card rather than a single line. */
  children?: ReactNode;
  /** The rail stops at the last step rather than running into white space. */
  last?: boolean;
}

const RAIL: Record<NonNullable<SequenceStepProps['tone']>, string> = {
  clear: color.teal,
  breach: color.creativeText,
  attention: color.auditingText,
  neutral: color.oat,
};

export function SequenceStep({
  label,
  summary,
  note,
  tone = 'clear',
  children,
  last,
}: SequenceStepProps) {
  const accent = RAIL[tone];
  const open = Boolean(children);

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div style={{ flex: 'none', width: 86, paddingTop: open ? 17 : 13 }}>
        <div
          style={{
            ...metaLabel,
            letterSpacing: '0.05em',
            color: tone === 'clear' || tone === 'neutral' ? color.muted : accent,
          }}
        >
          {label}
        </div>
      </div>
      <div
        style={{
          flex: 'none',
          width: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
        aria-hidden
      >
        <div
          style={{
            width: open ? 14 : 10,
            height: open ? 14 : 10,
            borderRadius: radius.pill,
            background: accent,
            marginTop: open ? 16 : 14,
          }}
        />
        {last ? null : <div style={{ width: 2, flexGrow: 1, background: color.oat }} />}
      </div>
      <div style={{ flexGrow: 1, minWidth: 0, padding: open ? '5px 0 16px' : '11px 0 16px' }}>
        {open ? (
          children
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            {summary ? <span style={{ ...bodyText, color: color.ink }}>{summary}</span> : null}
            {note ? <span style={{ ...metaLabel, color: accent }}>{note}</span> : null}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A step that opens out — a breach, a returned write-up, a decision taken.
 *
 * The left border repeats the tone at the card so a reader scrolling past the
 * gutter still knows which one this is.
 */
export function SequenceCard({
  tone = 'breach',
  meta,
  title,
  children,
}: {
  tone?: 'breach' | 'attention' | 'clear';
  meta?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div
      style={{
        background: color.paper,
        border: hairline,
        borderLeft: `3px solid ${RAIL[tone]}`,
        borderRadius: radius.tile,
        padding: '16px 20px',
      }}
    >
      {meta ? (
        <div
          style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 7, flexWrap: 'wrap' }}
        >
          {meta}
        </div>
      ) : null}
      <p
        style={{
          margin: `0 0 ${children ? 7 : 0}px`,
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1.4,
          letterSpacing: '-0.01em',
          textWrap: 'pretty',
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

/** The heading a sequence runs under: a label, and a line saying what it is. */
export function SequenceHeading({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <>
      <div style={{ ...metaLabel, marginBottom: 4 }}>{label}</div>
      {children ? (
        <p style={{ ...bodyText, margin: '0 0 18px', maxWidth: '62ch' }}>{children}</p>
      ) : null}
    </>
  );
}
