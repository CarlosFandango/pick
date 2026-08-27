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
 * How an auditor appears on a client report.
 *
 * Coded by default. The manifest's S3.4 said to build coded first because
 * naming is additive — you can start naming a coded auditor, but you cannot
 * un-name one whose name a charity has already read.
 *
 * The code itself is not computed here. It comes from `audit_auditor_code()`,
 * which is the same code the S3.2 picker shows: an md5 of auditor and charity
 * together, so it is stable for that charity and meaningless to any other, and
 * never reversible into an identity. That is the S3.4 decision, taken
 * 2026-08-26 — a charity may recognise the auditor who did well last time and
 * ask for them again.
 *
 * There used to be a second scheme here, derived from the audit reference so
 * the same auditor read differently in every report. It was the opposite
 * intention, and it did not hold anyway: `audit.auditor_id` is on the row.
 */
export function auditorLabel(
  settings: ReportSettings,
  auditor: { fullName?: string | null; code?: string | null },
): string {
  if (settings.showAuditorName && auditor.fullName) return auditor.fullName;
  return auditor.code ? `Auditor ${auditor.code}` : 'PICK auditor';
}
