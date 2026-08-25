import { describe, expect, it } from 'vitest';
import { themeToCssText, themeToCssVariables } from '../src/css';
import { space, touchTarget } from '../src/primitives';
import { pickselDark, pickselLight, type Theme, type ThemeColors, themes } from '../src/theme';

const ALL_THEMES: Theme[] = [pickselLight, pickselDark];

/** WCAG 2.1 relative luminance. Test-only — not shipped in the package. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const [r, g, b] = linear as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe.each(ALL_THEMES)('theme: $name/$scheme', (theme) => {
  it('defines every colour role', () => {
    // The type enforces this at compile time; this catches a theme built at
    // runtime from brand config, which is how a rebrand will arrive.
    const required: (keyof ThemeColors)[] = [
      'background',
      'surface',
      'surfaceRaised',
      'border',
      'text',
      'textMuted',
      'textInverse',
      'primary',
      'primaryPressed',
      'danger',
      'success',
      'warning',
      'focus',
    ];
    for (const role of required) {
      expect(theme.colors[role], `missing role: ${role}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('keeps body text readable against every surface it sits on (WCAG AA)', () => {
    for (const surface of ['background', 'surface', 'surfaceRaised'] as const) {
      expect(
        contrast(theme.colors.text, theme.colors[surface]),
        `text on ${surface}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps muted text readable, which is where contrast usually slips', () => {
    expect(contrast(theme.colors.textMuted, theme.colors.background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['primary', 'danger', 'success'] as const)(
    'keeps inverse text readable on the %s fill',
    (role) => {
      expect(contrast(theme.colors.textInverse, theme.colors[role])).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('records that pass and fail are NOT separable in greyscale', () => {
    // The brand's teal and its deep creative red sit at almost the same
    // luminance (~1.1-1.2:1), so PASS and FAIL are near-identical in greyscale
    // and to a red-green colour-blind reader. On a pass/fail compliance
    // product read on a street in daylight, that matters.
    //
    // These are the brand's own colours and this repo does not get to nudge
    // them — see docs/PATTERNS.md. The mitigation is therefore mandatory at
    // the component layer: a verdict ALWAYS carries a label or icon, never
    // colour alone. This test pins the fact so nobody assumes otherwise.
    expect(contrast(theme.colors.success, theme.colors.danger)).toBeLessThan(1.5);
  });

  it('keeps both verdict colours readable on the surface they sit on', () => {
    // What the tokens CAN guarantee: each verdict colour is legible as text.
    for (const role of ['success', 'danger', 'warning'] as const) {
      expect(contrast(theme.colors[role], theme.colors.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('rebranding', () => {
  it('accepts a whole new palette without touching a component', () => {
    const charityBrand: Theme = {
      ...pickselLight,
      name: 'example-charity',
      colors: { ...pickselLight.colors, primary: '#6A1B9A', primaryPressed: '#4A126D' },
    };

    expect(themeToCssVariables(charityBrand)['--colour-primary']).toBe('#6A1B9A');
    expect(charityBrand.colors.text).toBe(pickselLight.colors.text);
  });
});

describe('themeToCssVariables', () => {
  it('emits a custom property for every colour role', () => {
    const vars = themeToCssVariables(pickselLight);
    for (const role of Object.keys(pickselLight.colors)) {
      const name = `--colour-${role.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
      expect(vars, `missing ${name}`).toHaveProperty(name);
    }
  });

  it('gives web values units and leaves the raw numbers for React Native', () => {
    expect(themeToCssVariables(pickselLight)['--space-md']).toBe('16px');
    expect(space.md).toBe(16);
  });

  it('renders a usable rule', () => {
    const css = themeToCssText(pickselDark, '[data-theme="dark"]');
    expect(css).toContain('[data-theme="dark"] {');
    // Field mode is the brand's dark navy, not a generic dark theme.
    expect(css).toContain('--colour-background: #041825;');
  });
});

describe('primitives', () => {
  it('has a monotonic spacing scale', () => {
    const values = Object.values(space);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });

  it('meets the accessible minimum touch target', () => {
    expect(touchTarget.minimum).toBeGreaterThanOrEqual(44);
    expect(touchTarget.comfortable).toBeGreaterThan(touchTarget.minimum);
  });

  it('exposes both schemes', () => {
    expect(Object.keys(themes)).toEqual(['light', 'dark']);
  });
});
