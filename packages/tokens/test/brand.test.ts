import { describe, expect, it } from 'vitest';
import { color } from '../src/brand';

/**
 * What each brand colour may be used for.
 *
 * `design/BUILD-GUIDE.md` states this in prose — "accent colour as fill needs
 * its paired ink; accent as text uses its deep pair" — and prose does not fail
 * a build. The pipeline rail shipped with `oat` (1.16:1) as step labels and an
 * `auditing` fill standing in for its text pair, because nothing said no.
 *
 * Every key of `color` must appear in exactly one list, so adding a token is a
 * deliberate decision about how it may be used rather than a free-for-all.
 */

/** Legible as body text on bone, paper and white. */
const TEXT_ON_LIGHT = [
  'ink',
  'tealInk',
  'navy',
  'recruitment',
  'bodyBrown',
  'muted',
  'teal',
  'link',
  'auditingText',
  'creativeText',
  'technology',
] as const;

/** Legible as body text on the field app's navy surfaces. */
const TEXT_ON_DARK = ['onDark', 'onDarkMuted', 'fieldMuted'] as const;

/** Backgrounds. Never text. */
const SURFACES = ['bone', 'paper', 'white', 'fieldBg', 'fieldSheet'] as const;

/** Hairlines, rules and dividers on the surface they divide. Never text. */
const HAIRLINES = [
  { role: 'oat', on: 'bone' },
  { role: 'fieldDim', on: 'fieldBg' },
] as const;

/** Signage: fills, chips and accents. As text they need their deep pair. */
const FILLS = ['auditing', 'auditingInk', 'blue', 'consulting', 'creative'] as const;

/** An accent used as a fill, and the colour that is legible on top of it. */
const FILL_INK_PAIRS = [
  { fill: 'auditing', ink: 'auditingInk' },
  { fill: 'teal', ink: 'bone' },
  { fill: 'navy', ink: 'onDark' },
] as const;

/** An accent used as a fill, and the deep colour to use when it must be text. */
const FILL_TEXT_PAIRS = [{ fill: 'auditing', text: 'auditingText' }] as const;

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

describe('brand colour uses', () => {
  it('classifies every token, so a new one cannot arrive unclassified', () => {
    const classified = [
      ...TEXT_ON_LIGHT,
      ...TEXT_ON_DARK,
      ...SURFACES,
      ...HAIRLINES.map((h) => h.role),
      ...FILLS,
    ] as readonly string[];

    expect([...classified].sort()).toEqual(Object.keys(color).sort());
  });

  it.each(TEXT_ON_LIGHT)('%s is readable as text on every light surface', (role) => {
    for (const surface of ['bone', 'paper', 'white'] as const) {
      expect(contrast(color[role], color[surface]), `${role} on ${surface}`).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });

  it.each(TEXT_ON_DARK)('%s is readable as text on the field surfaces', (role) => {
    for (const surface of ['fieldBg', 'fieldSheet', 'navy'] as const) {
      expect(contrast(color[role], color[surface]), `${role} on ${surface}`).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });

  it.each(HAIRLINES)('$role is a hairline on $on and is NOT readable as text', ({ role, on }) => {
    // Pinned as a fact, not an aspiration: if someone "fixes" oat to pass this,
    // every 1px rule in both apps turns into a heavy line.
    expect(contrast(color[role], color[on])).toBeLessThan(4.5);
  });

  it.each(FILL_INK_PAIRS)('$ink is readable on the $fill fill', ({ fill, ink }) => {
    expect(contrast(color[ink], color[fill])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(FILL_TEXT_PAIRS)('$fill is signage; $text is what to use as text', ({ fill, text }) => {
    expect(contrast(color[fill], color.bone), `${fill} as text`).toBeLessThan(4.5);
    expect(contrast(color[text], color.bone), `${text} as text`).toBeGreaterThanOrEqual(4.5);
  });
});
