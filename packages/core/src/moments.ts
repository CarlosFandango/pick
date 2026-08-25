/**
 * The two homes of a check.
 *
 * `AuditMoment` is what an auditor sees: the shape of a real interaction, in the
 * order it happens. `ComplianceCategory` is what scoring aggregates over.
 *
 * These lists never merge and the category never reaches the field app. An
 * auditor who knows a question is "the vulnerability one" answers it differently.
 */
export const AUDIT_MOMENTS = [
  'approach',
  'walk_up',
  'opening',
  'pitch',
  'ask',
  'tablet',
  'sign_up',
  'close',
] as const;

export type AuditMoment = (typeof AUDIT_MOMENTS)[number];

export const MOMENT_LABELS: Record<AuditMoment, string> = {
  approach: 'Approach',
  walk_up: 'Walk-up',
  opening: 'Opening',
  pitch: 'Pitch',
  ask: 'Ask',
  tablet: 'Tablet',
  sign_up: 'Sign-up',
  close: 'Close',
};

export const COMPLIANCE_CATEGORIES = [
  'identification',
  'solicitation_statement',
  'honesty_and_accuracy',
  'vulnerability',
  'pressure_and_persistence',
  'data_protection',
  'consent_and_cancellation',
  'site_conduct',
  'safeguarding',
  'record_keeping',
] as const;

export type ComplianceCategory = (typeof COMPLIANCE_CATEGORIES)[number];

/** Internal reporting only. Never render this in apps/field. */
export const CATEGORY_LABELS: Record<ComplianceCategory, string> = {
  identification: 'Identification',
  solicitation_statement: 'Solicitation statement',
  honesty_and_accuracy: 'Honesty and accuracy',
  vulnerability: 'Vulnerability',
  pressure_and_persistence: 'Pressure and persistence',
  data_protection: 'Data protection',
  consent_and_cancellation: 'Consent and cancellation',
  site_conduct: 'Site conduct',
  safeguarding: 'Safeguarding',
  record_keeping: 'Record keeping',
};

export function momentOrder(moment: AuditMoment): number {
  return AUDIT_MOMENTS.indexOf(moment);
}
