import { COMPLAINT_ROUTES } from '@picksel/core';
import { color, fontSize, fontWeight, radius } from '@picksel/tokens';
import { Chrome } from '@/components/Chrome';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { hairline, metaLabel } from '@/lib/theme';
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
      .select('id, reference, postcode')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  return (
    <Chrome
      active="audits"
      organisationName={organisation?.name ?? '—'}
      credits={balance?.balance ?? 0}
    >
      <div style={{ padding: '26px 32px', maxWidth: 720 }}>
        <h1
          style={{
            fontWeight: fontWeight.extrabold,
            fontSize: fontSize.xl,
            letterSpacing: '-0.03em',
            margin: '0 0 4px',
          }}
        >
          Raise a concern
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: fontSize.sm, color: color.muted }}>
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
              <div style={{ fontWeight: fontWeight.bold, fontSize: fontSize.md }}>
                {route.title}
              </div>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: fontSize.sm,
                  color: color.bodyBrown,
                  lineHeight: 1.55,
                }}
              >
                {route.description}
              </p>
              <p
                style={{
                  margin: '8px 0 0',
                  ...metaLabel,
                  textTransform: 'none',
                  letterSpacing: 0,
                  fontSize: fontSize.xs,
                }}
              >
                {route.outcome}
              </p>
            </div>
          ))}
        </div>

        <ComplaintForm audits={audits ?? []} />
      </div>
    </Chrome>
  );
}
