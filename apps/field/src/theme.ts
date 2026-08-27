import {
  type FontPlatform,
  nativeTextStyle,
  pickselDark,
  pickselLight,
  type ResolvedTextStyle,
  type TextRole,
  type Theme,
} from '@picksel/tokens';
import { Platform, useColorScheme } from 'react-native';

/**
 * The field app consumes the same tokens as the portal, rendered as React
 * Native styles rather than CSS variables. Shared vocabulary, separate
 * components — see docs/PATTERNS.md.
 */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? pickselDark : pickselLight;
}

/** `@picksel/tokens` stays platform-free, so the mapping happens here. */
const PLATFORM: FontPlatform = Platform.OS === 'android' ? 'android' : 'ios';

/**
 * Resolve a semantic text role for this device.
 *
 * Always use this rather than picking a fontSize: it is what keeps the field
 * app and the portal rendering the same scale from the same definition.
 *
 * `size` takes a step from the shared `fontSize` scale when a component wants a
 * role's family and weight at a different size — and matters here in a way it
 * does not on the web, because React Native leading is absolute. Setting
 * `fontSize` on top of a role, which is what these screens used to do, keeps the
 * role's leading and renders small text on tall lines.
 */
export function text(role: TextRole, size?: number): ResolvedTextStyle {
  return nativeTextStyle(role, PLATFORM, size);
}
