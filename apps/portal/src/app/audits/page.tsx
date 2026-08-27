import { AUDIT_TYPE_LABELS, CLIENT_STATUS, parseAuditStatus } from '@picksel/core';
import { color, fontSize, fontWeight, radius } from '@picksel/tokens';
import Link from 'next/link';
import { Chrome } from '@/components/Chrome';
import { StatusPill } from '@/components/StatusPill';
import { clientPage } from '@/lib/client-page';
import { hairline, metaLabel, mono } from '@/lib/theme';

/** One table cell: the list is real tabular data, so it is a real table. */
const cell = {
  padding: '11px 14px 11px 0',
  borderBottom: hairline,
  verticalAlign: 'middle',
} as const;

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
  const { supabase, organisationName, credits } = await clientPage();

  const { data: audits } = await supabase
    .from('audit')
    .select('id, reference, status, audit_type, postcode, window_start_on, window_end_on')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <Chrome active="audits" organisationName={organisationName} credits={credits}>
      <div style={{ padding: '26px 32px', maxWidth: 880 }}>
        <h1
          style={{
            fontWeight: fontWeight.extrabold,
            fontSize: fontSize.xl,
            letterSpacing: '-0.03em',
            margin: '0 0 20px',
          }}
        >
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
              fontSize: fontSize.sm,
            }}
          >
            Booked as <b style={{ fontFamily: mono }}>{booked}</b>. We will assign an auditor and
            let you know when the audit is under way.
          </p>
        ) : null}

        {audits?.length ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSize.sm }}>
            <caption style={{ ...metaLabel, textAlign: 'left', paddingBottom: 8 }}>
              Your {audits.length === 1 ? 'audit' : `${audits.length} most recent audits`}
            </caption>
            <thead>
              <tr>
                {['Reference', 'Type', 'Location', 'Window', 'Status'].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    style={{
                      ...metaLabel,
                      textAlign: 'left',
                      padding: '0 14px 8px 0',
                      borderBottom: hairline,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id}>
                  <td style={cell}>
                    <Link
                      href={`/audits/${audit.id}`}
                      style={{
                        fontFamily: mono,
                        fontSize: fontSize.xs,
                        fontWeight: fontWeight.semibold,
                        color: color.link,
                        textDecoration: 'none',
                      }}
                    >
                      {audit.reference}
                    </Link>
                  </td>
                  <td style={{ ...cell, fontWeight: fontWeight.semibold }}>
                    {AUDIT_TYPE_LABELS[audit.audit_type]}
                  </td>
                  <td style={{ ...cell, fontFamily: mono, fontSize: fontSize.xs }}>
                    {audit.postcode}
                  </td>
                  <td style={{ ...cell, color: color.bodyBrown, whiteSpace: 'nowrap' }}>
                    {audit.window_start_on} → {audit.window_end_on}
                  </td>
                  <td style={cell}>
                    <StatusPill chip={CLIENT_STATUS[parseAuditStatus(audit.status)]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: fontSize.sm, color: color.muted }}>No audits booked yet.</p>
        )}
      </div>
    </Chrome>
  );
}
