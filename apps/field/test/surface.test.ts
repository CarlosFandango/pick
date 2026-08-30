import { describe, expect, it } from 'vitest';
import { surface } from '../src/surface';

/**
 * The field app's surfaces have to stay readable against each other.
 *
 * This exists because of a real bug, not as a formality. Switching the field
 * app from light to dark was a mapping from raw tokens onto roles, and one
 * mapping was wrong in a way that types cannot catch: text that sat on the
 * TEAL FILL of a button was `color.bone`, the same token as the light page
 * background, so it followed the background to near-black and the primary
 * action on the home screen became unreadable — dark navy on teal, 1.4:1.
 *
 * A screenshot found it. A test should have.
 */

/** WCAG 2.1 relative luminance. Test-only, same maths as the tokens package. */
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

describe('what an auditor can read, outdoors, at arm’s length', () => {
  it.each([
    ['title on the ground', surface.title, surface.ground],
    ['title on a sheet', surface.title, surface.sheet],
    ['body on the ground', surface.body, surface.ground],
    ['body on a sheet', surface.body, surface.sheet],
  ])('%s clears 4.5:1', (_what, ink, ground) => {
    expect(contrast(ink, ground)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['muted on the ground', surface.muted, surface.ground],
    ['muted on a sheet', surface.muted, surface.sheet],
  ])('%s clears 3:1, the large-text floor', (_what, ink, ground) => {
    // Metadata labels are set large and letter-spaced, so the large-text
    // threshold is the honest one — but they still have to be legible in
    // daylight, so they do not get a pass below it.
    expect(contrast(ink, ground)).toBeGreaterThanOrEqual(3);
  });

  it('puts readable text on the accent, which is where the actions are', () => {
    // The bug. A primary action nobody can read is worse than no action.
    expect(contrast(surface.onAccent, surface.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['pass', 'pass'],
    ['fail', 'fail'],
    ['warn', 'warn'],
    ['link', 'link'],
  ] as const)('states the %s colour legibly on a sheet', (_what, role) => {
    // The brand's own `semantics` pair is chosen for a bone page: teal
    // measures 2.1:1 here and the deep creative red 2.4:1. These come from
    // `pickselField` instead, which the tokens describe as legible on navy.
    expect(contrast(surface[role], surface.sheet)).toBeGreaterThanOrEqual(3);
  });

  it('records that pass and fail are NOT separable in greyscale here either', () => {
    // The same fact `packages/tokens/test/theme.test.ts` pins for the themes.
    // These are the brand's colours and this repo does not get to nudge them,
    // so the mitigation is mandatory at the component layer: a verdict on this
    // app ALWAYS carries a word or an icon, never colour alone. An auditor
    // reading at arm's length in daylight is the worst case for it.
    //
    // Pinned rather than aspired to, so that nobody reads the two roles
    // sitting side by side in `surface` and assumes they are distinguishable.
    expect(contrast(surface.pass, surface.fail)).toBeLessThan(1.5);
  });

  it('keeps a sheet distinguishable from the ground without a border', () => {
    // Cards carry no outline in the field design, so the only thing separating
    // one from the page is this difference.
    expect(contrast(surface.sheet, surface.ground)).toBeGreaterThan(1.05);
  });

  it('is not itself readable on the accent, so it can never stand in for onAccent', () => {
    // The bug was `ink: surface.ground` on a teal chip — the ground colour
    // used as if it were the on-accent one. They are different roles and this
    // pins that they are not interchangeable.
    expect(contrast(surface.ground, surface.accent)).toBeLessThan(4.5);
  });

  it('never puts the accent straight onto the ground as text', () => {
    // Teal on #041825 is 2.6:1. If a screen ever needs accent-coloured text it
    // has to sit on a light fill, and this is the reminder.
    expect(contrast(surface.accent, surface.ground)).toBeLessThan(4.5);
  });
});
