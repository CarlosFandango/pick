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

export const pickselLight: Theme = {
  name: 'picksel',
  scheme: 'light',
  colors: {
    background: '#F7F8FA',
    surface: '#FFFFFF',
    surfaceRaised: '#EEF1F6',
    border: '#D8DEE9',

    text: '#111827',
    textMuted: '#5B6472',
    textInverse: '#FFFFFF',

    primary: '#1B4DB1',
    primaryPressed: '#143A88',

    // success/danger are separated in *luminance*, not just hue: red-green is
    // the common colour-blindness pair, and this is a pass/fail product. They
    // must still read as different in greyscale. See theme.test.ts.
    danger: '#8F1D17',
    success: '#15803D',
    warning: '#8A5A00',

    focus: '#1B4DB1',
  },
};

export const pickselDark: Theme = {
  name: 'picksel',
  scheme: 'dark',
  colors: {
    background: '#0E1116',
    surface: '#171B22',
    surfaceRaised: '#222835',
    border: '#333B4A',

    text: '#F2F4F8',
    textMuted: '#A2ABBA',
    textInverse: '#0E1116',

    primary: '#7FA6F0',
    primaryPressed: '#A8C2F5',

    danger: '#E8837C',
    success: '#9BE0B4',
    warning: '#E8C27A',

    focus: '#7FA6F0',
  },
};

export const themes = { light: pickselLight, dark: pickselDark } as const;
