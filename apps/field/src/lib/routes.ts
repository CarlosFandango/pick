import type { AuditStatus } from '@picksel/core';

/**
 * Where an audit takes you depends on where it has got to.
 *
 * Before the shift there is prep; during it, the write-up. An auditor should
 * not have to work out which screen they want — they tap the job and get the
 * thing that is due.
 *
 * Extracted from the My Audits tab when home needed the same answer. One
 * place, so the two lists cannot disagree about what a job is for.
 */
export function routeForAudit(status: AuditStatus, id: string): string | null {
  switch (status) {
    case 'assigned':
      return `/audit/${id}/prep`;
    case 'in_progress':
      return `/audit/${id}/write-up`;
    default:
      // Released, in review, no-show, cancelled: nothing left to do, and
      // opening a read-only screen would imply there was.
      return null;
  }
}

/** What the button on that route should say. Null when there is nowhere to go. */
export function actionForAudit(status: AuditStatus): string | null {
  switch (status) {
    case 'assigned':
      return 'Prep';
    case 'in_progress':
      return 'Write up';
    default:
      return null;
  }
}
