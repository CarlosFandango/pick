import { AUDIT_TYPE_LABELS } from '@picksel/core';
import { AdminChrome } from '@/components/AdminChrome';
import { AuditorRoster } from '@/components/admin/AuditorRoster';
import { BackLink } from '@/components/BackLink';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { adminPage, metaLabel, pageTitle } from '@/lib/theme';
import { AuditorActions } from './AuditorActions';

/**
 * S4.3 — the auditor roster.
 *
 * The screen the `vetting` row in the ops queue points at, and the gate the
 * whole marketplace hangs on: an auditor who is not approved is never offered
 * anything, so nothing else in the network moves until someone looks here.
 *
 * Pending first, always. This is a queue before it is a directory.
 *
 * Real names, deliberately. Coded identities exist to stop a *charity*
 * building a picture of an individual over time; PICK is the party doing the
 * vetting and cannot do it against a hash.
 */
export default async function AuditorsPage() {
  const session = await requireRole('pick_admin');
  const supabase = await supabaseServer();

  const { data: roster } = await supabase.rpc('auditor_roster');
  const rows = roster ?? [];
  const pending = rows.filter((r) => r.approval_status === 'pending').length;

  return (
    <AdminChrome who={session.fullName} queuePosition={`${pending} AWAITING VETTING`}>
      <div style={adminPage}>
        <BackLink href="/admin" label="Ops home" />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={pageTitle}>Auditors</h1>
          <span style={metaLabel}>
            {rows.length} on the network · {pending} awaiting vetting
          </span>
        </div>

        <AuditorRoster
          auditors={rows.map((a) => ({
            auditorId: a.auditor_id,
            fullName: a.full_name,
            approvalStatus: a.approval_status,
            basePostcode: a.base_postcode,
            avCapable: a.av_capable,
            areas: a.areas,
            methodologies: a.audit_types.map((t) => AUDIT_TYPE_LABELS[t]),
            auditsCompleted: a.audits_completed,
            openConflicts: a.open_conflicts,
          }))}
          actions={(auditor) => (
            <AuditorActions auditorId={auditor.auditorId} status={auditor.approvalStatus} />
          )}
        />
      </div>
    </AdminChrome>
  );
}
