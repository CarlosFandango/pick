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
 * A handle for an auditor within one report.
 *
 * Derived from the audit reference, so the same auditor reads consistently
 * through a single report and differently across reports. The intent was that a
 * charity could not build a picture of an individual over time.
 *
 * That intent is not currently achieved, and saying so here is more useful than
 * implying otherwise. `audit.auditor_id` is readable by the client that owns the
 * audit — it resolves to no profile they can see, so no name leaks, but it is
 * stable, so correlation across reports is a join away. And S3.2 codes the same
 * auditor a second way, from auditor and charity together, *deliberately* stable
 * so a charity can re-pick someone they rate. Two coding schemes with opposite
 * goals, and the raw id underneath both.
 *
 * S3.4 is marked DECISION PENDING in the manifest and this is that decision:
 * whether a charity may recognise an auditor across audits. Recorded in
 * docs/FUNCTIONALITY.md under Known gaps until it is made.
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
