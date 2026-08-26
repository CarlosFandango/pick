import { color } from './brand';

/**
 * Semantic colour roles.
 *
 * Components reference *roles* (`danger`, `surface`), never raw hex. Rebranding
 * is then a new object satisfying this type — no component changes, no grep for
 * `#0B5FFF`. The type is the contract: a theme missing a role will not compile.
 */
export interface ThemeColors {
  /** Page background, furthest back. */
  background: string;
  /** Cards, sheets, anything sitting on `background`. */
  surface: string;
  /** Pressed or hovered `surface`. */
  surfaceRaised: string;
  /** Hairlines and dividers. */
  border: string;

  /** Body copy on `background` or `surface`. */
  text: string;
  /** Secondary copy: captions, help text, timestamps. */
  textMuted: string;
  /** Copy placed on `primary` / `danger` / `success` fills. */
  textInverse: string;

  /** Primary action. */
  primary: string;
  primaryPressed: string;

  /** Destructive or failing. A failed check is `danger`. */
  danger: string;
  /** Passing, complete, healthy. */
  success: string;
  /** Needs attention but is not a failure — e.g. not observed. */
  warning: string;

  /** Keyboard/assistive focus ring. Never remove it without a replacement. */
  focus: string;
}

export interface Theme {
  name: string;
  scheme: 'light' | 'dark';
  colors: ThemeColors;
}

/**
 * The PICK brand, mapped onto the roles above.
 *
 * Every value is a reference into `design/tokens/tokens.ts`, not a copy of one.
 * These used to be hex literals with the token name in a trailing comment,
 * which meant a new design drop could change `color.bone` and leave the theme
 * on the old value — silently, under a comment asserting otherwise. Where the
 * brand offers a pairing (an accent used as a fill vs as text), the role picks
 * the pair the brand specifies rather than lightening or darkening anything.
 *
 * `success` is teal and `fail` is the creative deep pair, per `semantics` in
 * the design tokens. Those are the brand's own choices; the contrast tests in
 * theme.test.ts check them rather than adjust them, and a failure there is a
 * conversation with the designer, not a licence to nudge a hex.
 */
export const pickselLight: Theme = {
  name: 'pick',
  scheme: 'light',
  colors: {
    background: color.bone,
    surface: color.paper,
    surfaceRaised: color.white,
    border: color.oat,

    text: color.ink,
    textMuted: color.muted,
    textInverse: color.bone, // on teal and navy fills

    primary: color.teal,
    primaryPressed: color.tealInk,

    danger: color.creativeText, // the brand's deep pair, used as fail-red here
    success: color.teal,
    warning: color.auditingText, // the auditing deep pair — a NOTE, not a failure

    focus: color.link,
  },
};

/**
 * Field mode: the auditor is on a street, in daylight or dark, holding the
 * phone low. The design gives this its own dark navy surface set rather than
 * a generic dark theme, and it is the only place those colours are used.
 */
export const pickselField: Theme = {
  name: 'pick',
  scheme: 'dark',
  colors: {
    background: color.fieldBg,
    surface: color.fieldSheet,
    surfaceRaised: color.navy,
    border: color.fieldDim,

    text: color.onDark,
    textMuted: color.fieldMuted,
    textInverse: color.fieldBg,

    primary: color.blue,
    primaryPressed: color.onDarkMuted,

    danger: color.creative,
    success: color.consulting,
    warning: color.auditing,

    focus: color.blue,
  },
};

/** Kept as an alias: the field surface is the only dark context we have. */
export const pickselDark = pickselField;

export const themes = { light: pickselLight, dark: pickselField } as const;
