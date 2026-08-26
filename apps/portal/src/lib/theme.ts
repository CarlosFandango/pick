import { color, font, radius } from '@picksel/tokens';

/**
 * Web styling helpers over the PICK tokens.
 *
 * `design/tokens/tokens.ts` is the only styling source. Nothing in the portal
 * may name a colour, a font or a radius that is not from here.
 */
export const t = { color, font, radius };

/** Mono, caps, letterspaced — the design's register for metadata labels. */
export const metaLabel = {
  fontFamily: `'${font.mono}', ui-monospace, monospace`,
  fontWeight: font.monoWeight,
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: color.muted,
} as const;

export const sans = `'${font.sans}', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
export const mono = `'${font.mono}', ui-monospace, SFMono-Regular, Menlo, monospace`;

/** 1px oat hairline. The design has no shadows and no gradients. */
export const hairline = `1px solid ${color.oat}`;

export const card = {
  background: color.paper,
  border: hairline,
  borderRadius: radius.tile,
} as const;

/** Radii are 100px pill or 4–5px tile. Nothing between. */
export const pillButton = {
  background: color.teal,
  color: color.bone,
  borderRadius: radius.pill,
  padding: '13px 26px',
  fontWeight: 700,
  fontSize: 14,
  border: 'none',
  cursor: 'pointer',
  fontFamily: sans,
} as const;

/**
 * Visible to a screen reader, invisible on screen.
 *
 * For state a sighted reader gets from shape or colour and an assistive reader
 * would otherwise lose entirely. Colour never carries state on its own.
 */
export const srOnly = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;
