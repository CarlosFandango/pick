import { color, font, fontSize, fontStack, fontWeight, radius } from '@picksel/tokens';

/**
 * Web styling helpers over the PICK tokens.
 *
 * `design/tokens/tokens.ts` is the only styling source. Nothing in the portal
 * may name a colour, a font or a radius that is not from here.
 */
export const t = { color, font, radius };

/**
 * The brand faces, then the shared fallback stack.
 *
 * The CSS variables are bound by next/font in `app/layout.tsx`, which is what
 * actually serves Archivo and IBM Plex Mono. These used to name both families
 * directly and nothing loaded either, so both silently fell back — while
 * `layout.tsx` set the body from `fontStack` and got a different answer. One
 * source now: the variable if the face loaded, the shared stack if it did not.
 */
export const sans = `var(--font-sans), ${fontStack.sans.web}`;
export const mono = `var(--font-mono), ${fontStack.mono.web}`;

/** Mono, caps, letterspaced — the design's register for metadata labels. */
export const metaLabel = {
  fontFamily: mono,
  fontWeight: font.monoWeight,
  fontSize: fontSize.xs,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: color.muted,
} as const;

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
  fontWeight: fontWeight.bold,
  fontSize: fontSize.sm,
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

/** A button that reads as a link: secondary actions the design does not pill. */
export const textButton = {
  background: 'none',
  border: 'none',
  padding: 0,
  fontFamily: sans,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semibold,
  color: color.link,
  cursor: 'pointer',
} as const;

/**
 * A page heading. Seven screens spelled these three properties out inline.
 *
 * Margin is deliberately not set: the parent's flex gap owns spacing, so a
 * heading does not have to know what follows it.
 */
export const pageTitle = {
  fontWeight: fontWeight.extrabold,
  fontSize: fontSize.xl,
  letterSpacing: '-0.03em',
  margin: 0,
} as const;

/** The admin shell supplies no padding, so every ops page repeats this. */
export const adminPage = {
  padding: '22px 28px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
} as const;
