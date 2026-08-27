import { type FontWeightValue, fontSize, fontWeight, lineHeight } from './primitives';

/**
 * Font stacks, per platform.
 *
 * React Native takes a single family name, not a CSS stack, so the value is
 * split by platform rather than shared as one string. Each entry resolves to
 * the same typeface where the platform has one: San Francisco on Apple, Roboto
 * on Android, Segoe on Windows.
 *
 * That is a deliberate choice over shipping a webfont. A bundled family would
 * render identically everywhere, at the cost of font files in the app binary,
 * expo-font loading, a flash of unstyled text on the web, and a licence to
 * track. System fonts cost nothing, render natively, and on the two surfaces
 * PICKsel is demoed from — macOS browser and iOS — are the same typeface.
 * Revisit when brand requires a specific face, not before.
 */
export const fontStack = {
  sans: {
    web: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    ios: 'System',
    android: 'sans-serif',
  },
  mono: {
    web: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    ios: 'Menlo',
    android: 'monospace',
  },
} as const;

export type FontFamily = keyof typeof fontStack;
export type FontPlatform = keyof (typeof fontStack)['sans'];

/**
 * Semantic text roles.
 *
 * Both apps render *these*, not raw sizes. That is what makes the portal and
 * the field app look like one product: neither picks a number, so neither can
 * drift from the other.
 *
 * `mono` roles exist because references (PS-001000) and postcodes are read
 * character by character, often aloud, and proportional digits make that harder.
 */
export const textStyle = {
  display: {
    family: 'sans',
    size: fontSize.xxl,
    weight: fontWeight.bold,
    leading: lineHeight.tight,
  },
  title: {
    family: 'sans',
    size: fontSize.lg,
    weight: fontWeight.semibold,
    leading: lineHeight.tight,
  },
  body: {
    family: 'sans',
    size: fontSize.md,
    weight: fontWeight.regular,
    leading: lineHeight.normal,
  },
  caption: {
    family: 'sans',
    size: fontSize.sm,
    weight: fontWeight.regular,
    leading: lineHeight.normal,
  },
  code: {
    family: 'mono',
    size: fontSize.sm,
    weight: fontWeight.regular,
    leading: lineHeight.normal,
  },
} as const satisfies Record<
  string,
  { family: FontFamily; size: number; weight: string; leading: number }
>;

export type TextRole = keyof typeof textStyle;

export interface ResolvedTextStyle {
  fontFamily: string;
  fontSize: number;
  /** Literal union, not string: React Native's TextStyle rejects a wide string. */
  fontWeight: FontWeightValue;
  lineHeight: number;
}

/**
 * Web: `lineHeight` stays a unitless multiplier, which is what CSS wants.
 * Returns a plain object usable directly as a React inline style.
 *
 * `size` overrides the role's own step for the cases where a component wants a
 * role's family and weight at a different step of the scale — a heading one
 * size down, a figure one size up. It must still come from `fontSize`; the
 * point of the scale is that nobody picks a number.
 */
export function webTextStyle(role: TextRole, size: number = textStyle[role].size) {
  const t = textStyle[role];
  return {
    fontFamily: fontStack[t.family].web,
    fontSize: size,
    fontWeight: t.weight,
    lineHeight: t.leading,
  };
}

/**
 * React Native: `lineHeight` is an absolute pixel value, so the multiplier is
 * resolved against the size here. Same numbers, different unit convention —
 * the one place the two platforms genuinely disagree.
 *
 * Which is also why the `size` override matters more here than on the web. CSS
 * inherits a unitless multiplier, so changing a font-size re-leads itself; React
 * Native does not, so a component that set `fontSize` on top of a role kept the
 * role's absolute leading and quietly rendered 24pt text on 38pt lines.
 */
export function nativeTextStyle(
  role: TextRole,
  platform: FontPlatform,
  size: number = textStyle[role].size,
): ResolvedTextStyle {
  const t = textStyle[role];
  return {
    fontFamily: fontStack[t.family][platform],
    fontSize: size,
    fontWeight: t.weight,
    lineHeight: Math.round(size * t.leading),
  };
}
