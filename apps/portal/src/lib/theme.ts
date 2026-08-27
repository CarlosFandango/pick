import { color, font, fontStack, radius } from '@picksel/tokens';

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
  fontSize: 10,
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
  fontWeight: 700,
  fontSize: 14,
  border: 'none',
  cursor: 'pointer',
  fontFamily: sans,
} as const;
