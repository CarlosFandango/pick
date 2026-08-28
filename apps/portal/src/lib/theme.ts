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

/**
 * A sentence.
 *
 * `metaLabel` is a label style — 10px monospace, letter-spaced, uppercase —
 * and it is right for AVAILABLE, STATUS, NEEDS A HUMAN. It was also being used
 * for prose, because there was nothing else to reach for, and a paragraph set
 * in it reads as terminal output rather than as writing.
 *
 * The tell was `{ ...metaLabel, textTransform: 'none' }` appearing at a dozen
 * call sites: undoing half a style is how you find out you wanted a different
 * one (TND-102).
 *
 * Rule of thumb: if it ends in a full stop, it is not a label.
 */
export const bodyText = {
  fontFamily: `'${font.sans}', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`,
  fontSize: 13.5,
  lineHeight: 1.55,
  color: color.bodyBrown,
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

/** A button that reads as a link: secondary actions the design does not pill. */
export const textButton = {
  background: 'none',
  border: 'none',
  padding: 0,
  fontFamily: sans,
  fontSize: 12.5,
  fontWeight: 600,
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
  fontWeight: 800,
  fontSize: 24,
  letterSpacing: '-0.03em',
  margin: 0,
} as const;

/** The admin shell supplies no padding, so every ops page repeats this. */
/**
 * A client page's measure.
 *
 * Every client screen already declared a max width and none of them centred
 * it, so the report and the ledger rendered as a column hard against the left
 * edge of a 1440px window with 45% of the screen empty — which reads as a page
 * that failed to load rather than as a deliberate column (TND-101).
 *
 * The measure itself is right: the report is prose, and prose set 1400px wide
 * is unreadable. `margin: 0 auto` was the whole fix.
 *
 * One definition, because five pages each stating their own width is five
 * places to disagree — and they already did: 720, 820, 880.
 */
export const clientColumn = {
  padding: '26px 32px',
  maxWidth: 880,
  margin: '0 auto',
} as const;

export const adminPage = {
  padding: '22px 28px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
} as const;
