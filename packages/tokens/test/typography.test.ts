import { describe, expect, it } from 'vitest';
import {
  type FontPlatform,
  fontStack,
  nativeTextStyle,
  type TextRole,
  textStyle,
  webTextStyle,
} from '../src/typography';

const ROLES = Object.keys(textStyle) as TextRole[];
const NATIVE: FontPlatform[] = ['ios', 'android'];

describe('fontStack', () => {
  it('defines every platform for every family', () => {
    for (const [family, stack] of Object.entries(fontStack)) {
      for (const platform of ['web', 'ios', 'android'] as const) {
        expect(stack[platform], `${family}.${platform}`).toBeTruthy();
      }
    }
  });

  it('gives the web a stack with a generic fallback, so it degrades', () => {
    expect(fontStack.sans.web).toMatch(/sans-serif$/);
    expect(fontStack.mono.web).toMatch(/monospace$/);
  });

  it('gives React Native a single family name, not a CSS stack', () => {
    // RN silently renders the default face if handed a comma-separated list.
    for (const stack of Object.values(fontStack)) {
      for (const platform of NATIVE) {
        expect(stack[platform], `${platform}: ${stack[platform]}`).not.toContain(',');
      }
    }
  });
});

describe.each(ROLES)('text role: %s', (role) => {
  it('resolves to the same size and weight on web and native', () => {
    const web = webTextStyle(role);
    for (const platform of NATIVE) {
      const native = nativeTextStyle(role, platform);
      expect(native.fontSize, `${platform} size`).toBe(web.fontSize);
      expect(native.fontWeight, `${platform} weight`).toBe(web.fontWeight);
    }
  });

  it('converts line height from a web multiplier to native pixels', () => {
    const web = webTextStyle(role);
    const native = nativeTextStyle(role, 'ios');
    // The one genuine unit difference between the platforms.
    expect(web.lineHeight).toBeLessThan(3);
    expect(native.lineHeight).toBe(Math.round(web.fontSize * web.lineHeight));
  });

  it('resolves a real font family on every platform', () => {
    expect(webTextStyle(role).fontFamily).toBeTruthy();
    for (const platform of NATIVE) {
      expect(nativeTextStyle(role, platform).fontFamily).toBeTruthy();
    }
  });
});

describe('the scale as a whole', () => {
  it('orders display > title > body > caption', () => {
    const sizes = (['display', 'title', 'body', 'caption'] as const).map(
      (r) => webTextStyle(r).fontSize,
    );
    expect([...sizes].sort((a, b) => b - a)).toEqual(sizes);
  });

  it('uses a monospaced family only where reading character by character matters', () => {
    expect(webTextStyle('code').fontFamily).toBe(fontStack.mono.web);
    expect(webTextStyle('body').fontFamily).toBe(fontStack.sans.web);
  });
});
