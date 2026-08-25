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
 * Every value comes from `design/tokens/tokens.ts` — the design drop is the
 * only styling source, and nothing here may invent a colour. Where the brand
 * offers a pairing (an accent used as a fill vs as text), the role picks the
 * pair the brand specifies rather than lightening or darkening anything.
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
    background: '#F4EFE6', // bone
    surface: '#FBF8F1', // paper
    surfaceRaised: '#FFFFFF', // white
    border: '#E5DFD0', // oat — 1px hairlines, no shadows

    text: '#1C1A15', // ink
    textMuted: '#625C4C', // muted
    textInverse: '#F4EFE6', // bone, on teal/navy fills

    primary: '#0B5D5C', // teal
    primaryPressed: '#04201F', // teal ink

    danger: '#A4382C', // creative deep pair — fail-red in PICKsel
    success: '#0B5D5C', // teal — pass
    warning: '#8A6100', // auditing deep pair — note

    focus: '#0B6A68', // link
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
    background: '#041825', // fieldBg
    surface: '#0A2438', // fieldSheet
    surfaceRaised: '#062134', // navy
    border: '#4E6377', // fieldDim

    text: '#F4EFE6', // onDark
    textMuted: '#7E93A6', // fieldMuted
    textInverse: '#041825',

    primary: '#3F86E8', // blue — the on-navy companion
    primaryPressed: '#C6D4E2',

    danger: '#EC6A5E', // creative at full strength, legible on navy
    success: '#0E9B99', // consulting teal, legible on navy
    warning: '#F2A900', // auditing amber

    focus: '#3F86E8',
  },
};

/** Kept as an alias: the field surface is the only dark context we have. */
export const pickselDark = pickselField;

export const themes = { light: pickselLight, dark: pickselField } as const;
