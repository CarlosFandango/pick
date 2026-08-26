import {
  AUDIT_TYPE_LABELS,
  CLIENT_STATUS,
  hasReport,
  parseAuditStatus,
  SHIFT_PAYMENT_LABELS,
} from '@picksel/core';
import { color, radius } from '@picksel/tokens';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BackLink } from '@/components/BackLink';
import { Chrome } from '@/components/Chrome';
import { PipelineRail } from '@/components/PipelineRail';
import { clientPage } from '@/lib/client-page';
import { hairline, metaLabel, mono, pillButton } from '@/lib/theme';

/** S3.3 — one audit, with the rail and whatever it is waiting on. */
export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, organisationName, credits } = await clientPage();

  const { data: audit } = await supabase
    .from('audit')
    .select(
      'id, reference, status, audit_type, shift_payment_method, postcode, window_start_on, window_end_on, requires_av, released_at',
    )
    .eq('id', id)
    .maybeSingle();

  if (!audit) notFound();

  const status = parseAuditStatus(audit.status);

  return (
    <Chrome active="audits" organisationName={organisationName} credits={credits}>
      <div
        style={{
          padding: '26px 32px',
          maxWidth: 820,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <BackLink href="/audits" label="All audits" />

        <div>
          <div style={metaLabel}>{audit.reference}</div>
          <h1
            style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em', margin: '8px 0 0' }}
          >
            {AUDIT_TYPE_LABELS[audit.audit_type]} · {audit.postcode}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: color.muted }}>
            {audit.window_start_on} → {audit.window_end_on} ·{' '}
            {SHIFT_PAYMENT_LABELS[audit.shift_payment_method]}
            {audit.requires_av ? ' · A/V required' : ''}
          </p>
        </div>

        <PipelineRail status={status} />

        <div
          style={{
            background: color.paper,
            border: hairline,
            borderRadius: radius.tile,
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span style={{ ...metaLabel, color: color.bodyBrown }}>
            {CLIENT_STATUS[status].label}
          </span>
          {hasReport(status) ? (
            <Link
              href={`/reports/${audit.id}`}
              style={{ ...pillButton, marginLeft: 'auto', textDecoration: 'none' }}
            >
              Read the report
            </Link>
          ) : (
            <span
              style={{ marginLeft: 'auto', fontSize: 13, color: color.muted, fontFamily: mono }}
            >
              NO REPORT YET
            </span>
          )}
        </div>
      </div>
    </Chrome>
  );
}
