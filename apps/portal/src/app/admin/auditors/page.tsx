import { AUDIT_TYPE_LABELS } from '@picksel/core';
import { color } from '@picksel/tokens';
import { AdminChrome } from '@/components/AdminChrome';
import { BackLink } from '@/components/BackLink';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { adminPage, card, metaLabel, mono, pageTitle } from '@/lib/theme';
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

        {rows.length === 0 ? (
          <p style={{ fontSize: 13, color: color.muted }}>
            Nobody has applied yet. Auditors appear here as soon as they sign up.
          </p>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {rows.map((auditor) => (
              <li
                key={auditor.auditor_id}
                style={{
                  ...card,
                  borderTop:
                    auditor.approval_status === 'pending'
                      ? `5px solid ${color.auditing}`
                      : `1px solid ${color.oat}`,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 18,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{auditor.full_name}</span>
                    <span
                      style={{
                        ...metaLabel,
                        color:
                          auditor.approval_status === 'approved' ? color.teal : color.auditingText,
                      }}
                    >
                      {auditor.approval_status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 13, color: color.bodyBrown }}>
                    {auditor.audits_completed} completed
                    {auditor.open_conflicts > 0 ? (
                      // Conflicts are a hard block on assignment, never waivable.
                      // Surfaced here because it explains why someone is idle.
                      <>
                        {' · '}
                        <b>{auditor.open_conflicts} declared conflict(s)</b>
                      </>
                    ) : null}
                    {auditor.av_capable ? ' · A/V capable' : ''}
                  </div>

                  <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <Facts label="Areas">
                      {auditor.areas.length ? auditor.areas.join(' ') : 'none set'}
                    </Facts>
                    <Facts label="Methodologies">
                      {auditor.audit_types.length
                        ? auditor.audit_types.map((t) => AUDIT_TYPE_LABELS[t]).join(', ')
                        : 'none set'}
                    </Facts>
                    <Facts label="Based">{auditor.base_postcode ?? '—'}</Facts>
                  </div>
                </div>

                <AuditorActions auditorId={auditor.auditor_id} status={auditor.approval_status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminChrome>
  );
}

/** A labelled fact. Coverage and capability are why someone is or is not matched. */
function Facts({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 12.5 }}>
      <span style={{ ...metaLabel, marginRight: 6 }}>{label}</span>
      <span style={{ fontFamily: label === 'Areas' ? mono : undefined, color: color.bodyBrown }}>
        {children}
      </span>
    </span>
  );
}
