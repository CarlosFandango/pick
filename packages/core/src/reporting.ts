/**
 * Whether a client report names the auditor or codes them.
 *
 * Coded by default. The manifest's S3.4 records the decision as still open and
 * says to build coded first because naming is additive — you can start naming
 * a coded auditor, but you cannot un-name one whose name a charity has already
 * read.
 *
 * One setting, no fork in the code.
 */
export interface ReportSettings {
  showAuditorName: boolean;
}

export const DEFAULT_REPORT_SETTINGS: ReportSettings = { showAuditorName: false };

/**
 * A stable, non-identifying handle for an auditor within one report.
 *
 * Derived from the audit reference so the same auditor reads consistently
 * through a single report, and differently across reports — a charity should
 * not be able to build a picture of an individual over time.
 */
export function auditorLabel(
  settings: ReportSettings,
  auditor: { fullName?: string | null; code?: string | null },
): string {
  if (settings.showAuditorName && auditor.fullName) return auditor.fullName;
  return auditor.code ? `Auditor ${auditor.code}` : 'PICK auditor';
}

/** A short code from the audit reference — no auditor identity in it at all. */
export function auditorCode(auditReference: string): string {
  const digits = auditReference.replace(/\D/g, '');
  return digits.slice(-3) || '000';
}
