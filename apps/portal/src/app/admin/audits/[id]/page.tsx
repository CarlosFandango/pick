import { AUDIT_TYPE_LABELS, CLIENT_STATUS, hasReport, parseAuditStatus } from '@picksel/core';
import { color, fontSize, fontWeight } from '@picksel/tokens';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminChrome } from '@/components/AdminChrome';
import { BackLink } from '@/components/BackLink';
import { StatusPill } from '@/components/StatusPill';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { adminPage, card, metaLabel, mono, pageTitle } from '@/lib/theme';

/**
 * S4.4 — one audit, from the inside.
 *
 * Three of the six ops queue rows point here — an offer about to expire, a
 * no-show, a write-up gone stale — and until now every one of them was a 404.
 * So this is deliberately a situation report rather than a control panel: what
 * state is it in, who has it, what is it waiting on, and where do I go next.
 * The actions live on the screens that own them.
 */
export default async function AdminAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole('pick_admin');
  const supabase = await supabaseServer();

  const { data: audit } = await supabase
    .from('audit')
    .select(
      'id, reference, status, audit_type, shift_payment_method, postcode, window_start_on, window_end_on, requires_av, auditor_id, auditor_fee_minor_units, client_organisation_id, submitted_at, released_at, no_team_present_at',
    )
    .eq('id', id)
    .maybeSingle();

  if (!audit) notFound();

  const status = parseAuditStatus(audit.status);

  const [{ data: organisation }, { data: offers }, { data: auditor }] = await Promise.all([
    supabase.from('organisation').select('name').eq('id', audit.client_organisation_id).single(),
    supabase
      .from('audit_offer')
      .select('id, auditor_id, outcome, expires_at, match_reason')
      .eq('audit_id', id),
    audit.auditor_id
      ? supabase.from('user_profile').select('full_name').eq('id', audit.auditor_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <AdminChrome who={session.fullName} queuePosition={audit.reference}>
      <div style={adminPage}>
        <BackLink href="/admin" label="Ops home" />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={pageTitle}>
            {AUDIT_TYPE_LABELS[audit.audit_type]} · {audit.postcode}
          </h1>
          <StatusPill chip={CLIENT_STATUS[status]} />
          <span style={{ ...metaLabel, marginLeft: 'auto', fontFamily: mono }}>
            {audit.reference}
          </span>
        </div>

        <section style={{ ...card, padding: 18, display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          <Fact label="Charity">{organisation?.name ?? '—'}</Fact>
          <Fact label="Window">
            {audit.window_start_on} → {audit.window_end_on}
          </Fact>
          <Fact label="Auditor">{auditor?.full_name ?? 'Unassigned'}</Fact>
          <Fact label="Offers">
            {offers?.length ?? 0} sent
            {offers?.some((o) => o.outcome === 'offered') ? ', still open' : ''}
          </Fact>
        </section>

        <div style={{ display: 'flex', gap: 20 }}>
          {status === 'booked' ? (
            <Link href={`/admin/assignment/${audit.id}`} style={link}>
              Assignment console
            </Link>
          ) : null}
          {status === 'in_review' ? (
            <Link href={`/admin/review/${audit.id}`} style={link}>
              Review the write-up
            </Link>
          ) : null}
          {hasReport(status) ? (
            <Link href={`/reports/${audit.id}`} style={link}>
              The client's report
            </Link>
          ) : null}
        </div>
      </div>
    </AdminChrome>
  );
}

const link = {
  color: color.link,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  textDecoration: 'none',
} as const;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={metaLabel}>{label}</div>
      <div style={{ fontSize: fontSize.sm, marginTop: 3 }}>{children}</div>
    </div>
  );
}
