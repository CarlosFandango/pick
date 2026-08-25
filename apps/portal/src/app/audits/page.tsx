import { AUDIT_TYPE_LABELS, CLIENT_STATUS, parseAuditStatus } from '@picksel/core';
import { color, radius } from '@picksel/tokens';
import Link from 'next/link';
import { Chrome } from '@/components/Chrome';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { hairline, metaLabel, mono } from '@/lib/theme';

/**
 * S1.9 in outline — enough to land on after booking. The full dashboard with
 * the pipeline rail is S3.3; this shows the row exists and the credit moved.
 */
export default async function AuditsPage({
  searchParams,
}: {
  searchParams: Promise<{ booked?: string }>;
}) {
  const { booked } = await searchParams;
  const session = await requireRole('client', 'pick_admin');
  const supabase = await supabaseServer();

  const [{ data: organisation }, { data: balance }, { data: audits }] = await Promise.all([
    supabase
      .from('organisation')
      .select('name')
      .eq('id', session.organisationId ?? '')
      .single(),
    supabase
      .from('organisation_credit_balance')
      .select('balance')
      .eq('organisation_id', session.organisationId ?? '')
      .maybeSingle(),
    supabase
      .from('audit')
      .select('id, reference, status, audit_type, postcode, window_start_on, window_end_on')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  return (
    <Chrome
      active="audits"
      organisationName={organisation?.name ?? '—'}
      credits={balance?.balance ?? 0}
    >
      <div style={{ padding: '26px 32px', maxWidth: 880 }}>
        <h1 style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em', margin: '0 0 20px' }}>
          Audits
        </h1>

        {booked ? (
          <p
            style={{
              margin: '0 0 20px',
              background: color.paper,
              border: hairline,
              borderTop: `5px solid ${color.teal}`,
              borderRadius: radius.tile,
              padding: '14px 18px',
              fontSize: 13,
            }}
          >
            Booked as <b style={{ fontFamily: mono }}>{booked}</b>. We will assign an auditor and
            let you know when the audit is under way.
          </p>
        ) : null}

        {audits?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {audits.map((audit) => (
              <Link
                key={audit.id}
                href={`/audits/${audit.id}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  background: color.paper,
                  border: hairline,
                  borderRadius: radius.tile,
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                }}
              >
                <span style={{ fontFamily: mono, fontSize: 12 }}>{audit.reference}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {AUDIT_TYPE_LABELS[audit.audit_type]}
                </span>
                <span style={{ fontSize: 13, color: color.muted }}>{audit.postcode}</span>
                <span style={{ fontSize: 12.5, color: color.muted }}>
                  {audit.window_start_on} → {audit.window_end_on}
                </span>
                <span style={{ ...metaLabel, marginLeft: 'auto', color: color.bodyBrown }}>
                  {CLIENT_STATUS[parseAuditStatus(audit.status)].label}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: color.muted }}>No audits booked yet.</p>
        )}
      </div>
    </Chrome>
  );
}
