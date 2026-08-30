import { color, pickselField } from '@picksel/tokens';

/**
 * The field app's own surfaces, as roles.
 *
 * The field app is DARK. Every one of the nine field screens in the design
 * drop sits on `#041825`, and `@picksel/tokens` has carried `fieldBg` and
 * `fieldSheet` as "PICKsel field-mode surfaces from mockups" since the tokens
 * were written — nothing had ever used them outside the session screen.
 *
 * Why dark, when a phone outdoors argues for light: an auditor is running a
 * mystery shop. A bright screen held at arm's length is the most conspicuous
 * thing they can be carrying, and being noticed ends the audit. Street shifts
 * also run into the evening. The session screen was already dark for exactly
 * this reason; the rest of the app was light because nobody had said
 * otherwise.
 *
 * THE STATE COLOURS COME FROM `pickselField`, not from `semantics`. The
 * brand's `semantics` pair — teal pass, creative-deep fail — is chosen for a
 * bone-coloured page and measures 2.4:1 and 2.7:1 on this one. `pickselField`
 * already carries the on-navy equivalents, described in the tokens as
 * "legible on navy", and the tokens' own theme test enforces that the two stay
 * separated in LUMINANCE as well as hue — which is the rule that matters for
 * a pass/fail product where red-green is the common colour-blindness pair.
 * That theme existed and nothing used it.
 *
 * Named as roles rather than used as tokens so that a second theme — or a
 * change of mind about this one — is a change to this object and not to three
 * hundred call sites. `color.bone` in a field component is now a bug.
 */
export const surface = {
  /** The page behind everything. */
  ground: color.fieldBg,
  /** A card, a row, a sheet raised off the ground. */
  sheet: color.fieldSheet,
  /** A hairline, a divider, the edge of a control. */
  line: color.fieldDim,
  /** Headings and anything that has to be read at arm's length. */
  title: color.onDark,
  /** Running text. */
  body: color.onDarkMuted,
  /** Labels, metadata, anything subordinate. */
  muted: color.fieldMuted,
  /** The one accent. Actions, and progress that is going well. */
  accent: color.teal,
  /** On top of the accent, or on any state fill. */
  onAccent: color.bone,

  /** A check that passed, as TEXT on a dark surface. */
  pass: pickselField.colors.success,
  /** A check that failed. Separated from `pass` in luminance, not just hue. */
  fail: pickselField.colors.danger,
  /** Something worth saying that is not a failure. */
  warn: pickselField.colors.warning,
  /** A link, or a secondary action rendered as text. */
  link: pickselField.colors.primaryPressed,
} as const;
