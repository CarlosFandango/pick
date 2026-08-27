import { AUDIT_TYPE_LABELS } from '@picksel/core';
import { color, fontSize, fontWeight, radius } from '@picksel/tokens';
import { notFound } from 'next/navigation';
import { AdminChrome } from '@/components/AdminChrome';
import { BackLink } from '@/components/BackLink';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { hairline, metaLabel, mono } from '@/lib/theme';
import { OfferButton } from './OfferButton';

/**
 * S4.2 — the assignment console.
 *
 * The algorithm shows its work: everyone considered, and the reason each was
 * set aside. An operator asking why an audit has not been taken gets an
 * answer, not a shorter list.
 */
export default async function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole('pick_admin');
  const supabase = await supabaseServer();

  const { data: audit } = await supabase
    .from('audit')
    .select(
      'id, reference, status, audit_type, postcode, window_start_on, window_end_on, requires_av',
    )
    .eq('id', id)
    .maybeSingle();

  if (!audit) notFound();

  const { data: pool } = await supabase.rpc('assignment_console', { p_audit_id: id });

  const rows = pool ?? [];
  const eligible = rows.filter((row) => row.eligible);

  return (
    <AdminChrome
      who={session.fullName}
      queuePosition={`ASSIGNMENT · ${audit.reference} · ${audit.postcode}`}
    >
      <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <BackLink href="/admin" label="Ops home" />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1
            style={{
              fontWeight: fontWeight.extrabold,
              fontSize: fontSize.lg,
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            {AUDIT_TYPE_LABELS[audit.audit_type]} · {audit.postcode}
          </h1>
          <span style={{ ...metaLabel }}>
            {eligible.length} eligible of {rows.length} active
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: mono,
              fontSize: fontSize.xs,
              color: color.muted,
            }}
          >
            WINDOW {audit.window_start_on} → {audit.window_end_on}
            {audit.requires_av ? ' · A/V REQUIRED' : ''}
          </span>
        </div>

        {audit.status === 'booked' ? <OfferButton auditId={audit.id} /> : null}

        <section
          style={{
            background: color.paper,
            border: hairline,
            borderRadius: radius.tile,
            padding: '16px 20px',
          }}
        >
          <h2 style={{ ...metaLabel, margin: '0 0 10px' }}>
            Eligible pool — and who was set aside
          </h2>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {rows.map((row, i) => (
              <li
                key={row.auditor_id}
                style={{
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                  padding: '11px 0',
                  borderBottom: i < rows.length - 1 ? hairline : 'none',
                  fontSize: fontSize.sm,
                  opacity: row.eligible ? 1 : 0.75,
                }}
              >
                <span
                  style={{
                    background: row.eligible ? color.teal : 'transparent',
                    border: row.eligible ? 'none' : hairline,
                    borderRadius: radius.pill,
                    padding: '4px 10px',
                    fontFamily: mono,
                    fontSize: fontSize.xs,
                    letterSpacing: '0.1em',
                    color: row.eligible ? color.bone : color.muted,
                    flex: 'none',
                  }}
                >
                  {row.eligible ? 'ELIGIBLE' : 'SET ASIDE'}
                </span>

                <span style={{ flex: 1 }}>
                  <span style={{ fontFamily: mono, fontSize: fontSize.xs }}>
                    {row.auditor_id.slice(-6).toUpperCase()}
                  </span>
                  {row.reasons.length > 0 ? (
                    <span style={{ display: 'block', color: color.bodyBrown, marginTop: 2 }}>
                      {row.reasons.join(' · ')}
                    </span>
                  ) : null}
                  {row.warnings.length > 0 ? (
                    <span style={{ display: 'block', color: color.auditingText, marginTop: 2 }}>
                      {row.warnings.join(', ')}
                    </span>
                  ) : null}
                </span>

                {row.offer_state ? (
                  <span style={{ ...metaLabel, color: color.bodyBrown }}>{row.offer_state}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminChrome>
  );
}
