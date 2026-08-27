import type { StatusChip, StatusTone } from '@picksel/core';
import { color, fontSize, fontWeight, radius } from '@picksel/tokens';
import { mono } from '@/lib/theme';

/**
 * A status, readable at a glance.
 *
 * Tones come from `core` as roles; the colours are chosen here because they
 * are web. Every pill carries its label, so the colour is reinforcement and
 * never the message — the brand's teal and red are near-identical in
 * greyscale (see `packages/tokens/test/theme.test.ts`).
 *
 * Nothing here is fail-red. An audit can be cancelled or find nobody there,
 * and neither is a failure by anyone.
 */
const TONE: Record<StatusTone, { fill: string; ink: string; border: string }> = {
  neutral: { fill: 'transparent', ink: color.muted, border: color.oat },
  progress: { fill: color.auditing, ink: color.auditingInk, border: color.auditing },
  good: { fill: color.teal, ink: color.bone, border: color.teal },
  info: { fill: color.navy, ink: color.onDarkMuted, border: color.navy },
};

export function StatusPill({ chip }: { chip: StatusChip }) {
  const tone = TONE[chip.tone];

  return (
    <span
      style={{
        display: 'inline-block',
        background: tone.fill,
        color: tone.ink,
        border: `1px solid ${tone.border}`,
        borderRadius: radius.pill,
        padding: '3px 10px',
        fontFamily: mono,
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        letterSpacing: '0.1em',
        whiteSpace: 'nowrap',
      }}
    >
      {chip.label}
    </span>
  );
}
