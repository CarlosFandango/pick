import { AUDIT_TYPE_LABELS } from '@picksel/core';
import { AdminChrome } from '@/components/AdminChrome';
import { AuditorRoster } from '@/components/admin/AuditorRoster';
import { BackLink } from '@/components/BackLink';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { adminPage, metaLabel, pageTitle } from '@/lib/theme';
import { AuditorActions } from './AuditorActions';
import { InviteAuditor } from './InviteAuditor';

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

  // Two different things, and the queue only counts one of them. Somebody who
  // has not opened their invitation cannot be vetted, so counting them would
  // make the ops queue point at work that does not exist yet.
  const invited = rows.filter((r) => r.user_status === 'invited');
  const onNetwork = rows.filter((r) => r.user_status !== 'invited');
  const pending = onNetwork.filter((r) => r.approval_status === 'pending').length;

  return (
    <AdminChrome who={session.fullName} queuePosition={`${pending} AWAITING VETTING`}>
      <div style={adminPage}>
        <BackLink href="/admin" label="Ops home" />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={pageTitle}>Auditors</h1>
          <span style={metaLabel}>
            {onNetwork.length} on the network · {pending} awaiting vetting
            {invited.length > 0 ? ` · ${invited.length} not yet accepted` : ''}
          </span>
        </div>

        <InviteAuditor />

        {invited.length > 0 ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={metaLabel}>Invited — not yet accepted</span>
            {invited.map((a) => (
              <p key={a.auditor_id} style={{ margin: 0, fontSize: 13 }}>
                {/* The email is the only identity an invitee has until they
                    accept and choose a name. Without it these rows are
                    indistinguishable and nobody can be chased. */}
                {a.full_name || a.email}
              </p>
            ))}
          </section>
        ) : null}

        <AuditorRoster
          auditors={onNetwork.map((a) => ({
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
