/**
 * Capabilities the product can offer, and whether they are actually there yet.
 *
 * A flag here means the data model and the screens are ready but the thing
 * behind them is not, so the control must not be shown — a charity that ticks
 * "require A/V" and gets nothing has been told something untrue at the moment
 * they spent a credit.
 *
 * Deliberately a `const`, not a table or an environment variable: there is one
 * environment's worth of truth here today, and a flag whose value can differ
 * per deployment is a flag whose behaviour nobody can reason about. Turning one
 * on is a commit, which is also the audit trail of when it changed.
 */
export const FEATURES = {
  /**
   * Video and audio evidence: capture on the device, storage, retention and
   * playback in the report. `evidence_attachment` models the pointer, and
   * nothing writes to it. Consent and retention are product decisions that
   * have not been made — see docs/FUNCTIONALITY.md, "Deferred".
   */
  avEvidence: false,
} as const;

export type Feature = keyof typeof FEATURES;

export function isEnabled(feature: Feature): boolean {
  return FEATURES[feature];
}
