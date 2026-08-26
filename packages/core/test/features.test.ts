import { describe, expect, it } from 'vitest';
import { FEATURES, isEnabled } from '../src/features';

describe('feature flags', () => {
  it('keeps A/V evidence off until there is something behind it', () => {
    // The pointer entity exists; capture, storage, retention and playback do
    // not. Offering the choice at the moment a credit is spent would be a
    // promise the product cannot keep. Turning this on is a deliberate commit,
    // and this test is the thing that makes it deliberate.
    expect(isEnabled('avEvidence')).toBe(false);
  });

  it('is a plain boolean map, so a flag cannot be half-defined', () => {
    for (const [name, value] of Object.entries(FEATURES)) {
      expect(typeof value, `${name} is not a boolean`).toBe('boolean');
    }
  });
});
