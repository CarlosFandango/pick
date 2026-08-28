import { COMPLAINT_ROUTES } from '@picksel/core';
import { color, radius } from '@picksel/tokens';
import { BackLink } from '@/components/BackLink';
import { Chrome } from '@/components/Chrome';
import { clientPage } from '@/lib/client-page';
import { bodyText, clientColumn, hairline, metaLabel } from '@/lib/theme';
import { ComplaintForm } from './ComplaintForm';

/**
 * S3.6 — the complaint fork.
 *
 * A charity arriving with a problem does not know whose problem it is. This
 * screen's job is to sort that out before they type, because the two paths go
 * to different people — and burying a regulatory matter in a quality queue is
 * the failure mode it exists to prevent.
 */
export default async function ComplaintPage() {
  const { supabase, organisationName, credits } = await clientPage();

  const { data: audits } = await supabase
    .from('audit')
    .select('id, reference, postcode')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <Chrome active="audits" organisationName={organisationName} credits={credits}>
      <div style={clientColumn}>
        <div style={{ marginBottom: 16 }}>
          <BackLink href="/audits" label="All audits" />
        </div>
        <h1 style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em', margin: '0 0 4px' }}>
          Raise a concern
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: color.muted }}>
          Two different things, handled two different ways. Pick the one that fits.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {COMPLAINT_ROUTES.map((route) => (
            <div
              key={route.subject}
              style={{
                background: color.paper,
                border: hairline,
                borderTop: `5px solid ${route.subject === 'about_audit' ? color.teal : color.auditing}`,
                borderRadius: radius.tile,
                padding: 18,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15 }}>{route.title}</div>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 13,
                  color: color.bodyBrown,
                  lineHeight: 1.55,
                }}
              >
                {route.description}
              </p>
              <p style={{ ...bodyText, margin: '8px 0 0', fontSize: 12.5 }}>{route.outcome}</p>
            </div>
          ))}
        </div>

        <ComplaintForm audits={audits ?? []} />
      </div>
    </Chrome>
  );
}
