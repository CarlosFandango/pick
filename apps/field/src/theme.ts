import { pickselDark, pickselLight, type Theme } from '@picksel/tokens';
import { useColorScheme } from 'react-native';

/**
 * The field app consumes the same tokens as the portal, but renders them as
 * React Native styles rather than CSS variables. Shared vocabulary, separate
 * components — see docs/PATTERNS.md.
 */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? pickselDark : pickselLight;
}
