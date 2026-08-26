import { AUDIT_TYPE_LABELS, CLIENT_STATUS, parseAuditStatus } from '@picksel/core';
import { color } from '@picksel/tokens';
import Link from 'next/link';
import { AdminChrome } from '@/components/AdminChrome';
import { BackLink } from '@/components/BackLink';
import { StatusPill } from '@/components/StatusPill';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { adminPage, hairline, metaLabel, mono, pageTitle } from '@/lib/theme';

/**
 * S4.4 — every audit, whatever state it is in.
 *
 * The ops home is a queue: it shows what needs a human *today*, which is the
 * right thing for it to be. But it meant an audit booked for next month was
 * unreachable — not filtered, genuinely unreachable, because nothing else
 * listed audits and nothing linked to the assignment console at all. An
 * operator asking "what did that charity book last week" had no answer.
 *
 * So this is the directory the queue is not. Newest first, no filters yet:
 * at this volume scanning is faster than choosing a filter, and a control
 * nobody needs is a permanent question.
 */
export default async function AdminAuditsPage() {
  const session = await requireRole('pick_admin');
  const supabase = await supabaseServer();

  const { data: audits } = await supabase
    .from('audit')
    .select(
      'id, reference, status, audit_type, postcode, window_start_on, window_end_on, auditor_id, client_organisation_id, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = audits ?? [];
  const organisationIds = [...new Set(rows.map((a) => a.client_organisation_id))];

  const { data: organisations } = await supabase
    .from('organisation')
    .select('id, name')
    .in('id', organisationIds.length ? organisationIds : ['']);

  const nameFor = new Map((organisations ?? []).map((o) => [o.id, o.name]));
  const unassigned = rows.filter((a) => a.status === 'booked' && !a.auditor_id).length;

  return (
    <AdminChrome who={session.fullName} queuePosition={`${unassigned} AWAITING AN AUDITOR`}>
      <div style={adminPage}>
        <BackLink href="/admin" label="Ops home" />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={pageTitle}>Audits</h1>
          <span style={metaLabel}>
            {rows.length} most recent · {unassigned} still need an auditor
          </span>
        </div>

        {rows.length === 0 ? (
          <p style={{ fontSize: 13, color: color.muted }}>Nothing booked yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <caption style={{ ...metaLabel, textAlign: 'left', paddingBottom: 8 }}>
              Every audit, newest first
            </caption>
            <thead>
              <tr>
                {['Reference', 'Charity', 'Type', 'Location', 'Window', 'Status', ''].map((h) => (
                  <th
                    key={h || 'go'}
                    scope="col"
                    style={{
                      ...metaLabel,
                      textAlign: 'left',
                      padding: '0 14px 8px 0',
                      borderBottom: hairline,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((audit) => {
                const status = parseAuditStatus(audit.status);
                return (
                  <tr key={audit.id}>
                    <td style={cell}>
                      <Link href={`/admin/audits/${audit.id}`} style={reference}>
                        {audit.reference}
                      </Link>
                    </td>
                    <td style={{ ...cell, fontWeight: 600 }}>
                      {nameFor.get(audit.client_organisation_id) ?? '—'}
                    </td>
                    <td style={cell}>{AUDIT_TYPE_LABELS[audit.audit_type]}</td>
                    <td style={{ ...cell, fontFamily: mono, fontSize: 12 }}>{audit.postcode}</td>
                    <td style={{ ...cell, color: color.bodyBrown, whiteSpace: 'nowrap' }}>
                      {audit.window_start_on} → {audit.window_end_on}
                    </td>
                    <td style={cell}>
                      <StatusPill chip={CLIENT_STATUS[status]} />
                    </td>
                    <td style={cell}>
                      {/*
                        The action that is actually waiting. An audit nobody
                        has accepted is the only kind that needs a decision
                        here rather than on its own page.
                      */}
                      {status === 'booked' ? (
                        <Link href={`/admin/assignment/${audit.id}`} style={reference}>
                          Assign
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AdminChrome>
  );
}

const cell = {
  padding: '11px 14px 11px 0',
  borderBottom: hairline,
  verticalAlign: 'middle',
} as const;

const reference = {
  fontFamily: mono,
  fontSize: 12,
  fontWeight: 600,
  color: color.link,
  textDecoration: 'none',
} as const;
