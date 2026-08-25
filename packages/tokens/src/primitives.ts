/**
 * Primitive scales. Values only — no meaning attached yet.
 *
 * Numbers, not strings with units: React Native styles take numbers, and the
 * web can add `px` at the edge. A token that only works on one platform is not
 * a shared token.
 */

export const space = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 16,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  loose: 1.75,
} as const;

/**
 * Touch targets. The field app is used one-handed, outdoors, in the rain, by
 * someone watching an interaction they cannot pause. 44 is the accessibility
 * floor; `comfortable` is the default for anything an auditor taps mid-audit.
 */
export const touchTarget = {
  minimum: 44,
  comfortable: 56,
} as const;

export type Space = keyof typeof space;
export type Radius = keyof typeof radius;
export type FontSize = keyof typeof fontSize;
export type FontWeight = keyof typeof fontWeight;
/** The values, not the keys. React Native's TextStyle needs the literal union. */
export type FontWeightValue = (typeof fontWeight)[FontWeight];
