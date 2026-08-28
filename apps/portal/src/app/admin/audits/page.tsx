import { parseAuditStatus } from '@picksel/core';
import { AdminChrome } from '@/components/AdminChrome';
import { type AuditQueryRow, AuditsTable, toAdminAuditRow } from '@/components/admin/AuditsTable';
import { BackLink } from '@/components/BackLink';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { adminPage, metaLabel, pageTitle } from '@/lib/theme';

/**
 * S4.4 — every audit, whatever state it is in.
 *
 * The ops home is a queue: what needs a human today, which is right for it.
 * But it was the only way in, so an audit booked for next month was
 * unreachable rather than merely filtered out.
 *
 * Fetch here, render in `AuditsTable` — the split exists so the table can be
 * tested in milliseconds instead of a browser.
 */
export default async function AdminAuditsPage() {
  const session = await requireRole('pick_admin');
  const supabase = await supabaseServer();

  const { data: audits } = await supabase
    .from('audit')
    .select(
      'id, reference, status, audit_type, postcode, window_start_on, window_end_on, auditor_id, client_organisation_id',
    )
    .order('created_at', { ascending: false })
    .limit(100);

  const raw = audits ?? [];
  const organisationIds = [...new Set(raw.map((a) => a.client_organisation_id))];

  const { data: organisations } = await supabase
    .from('organisation')
    .select('id, name')
    .in('id', organisationIds.length ? organisationIds : ['']);

  const nameFor = new Map((organisations ?? []).map((o) => [o.id, o.name]));

  const rows = raw.map((audit) =>
    toAdminAuditRow(
      { ...audit, status: parseAuditStatus(audit.status) } as AuditQueryRow,
      nameFor.get(audit.client_organisation_id) ?? '—',
    ),
  );

  const unassigned = raw.filter((a) => a.status === 'booked' && !a.auditor_id).length;

  return (
    <AdminChrome who={session.fullName} queuePosition={`${unassigned} AWAITING AN AUDITOR`}>
      <div style={adminPage}>
        <BackLink href="/admin" label="Ops home" />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={pageTitle}>Audits</h1>
          <span style={metaLabel}>{rows.length} most recent</span>
        </div>

        <AuditsTable audits={rows} />
      </div>
    </AdminChrome>
  );
}
