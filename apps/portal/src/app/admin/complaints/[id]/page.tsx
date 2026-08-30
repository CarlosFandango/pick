import { formatDay, MOMENT_LABELS, routeFor } from '@picksel/core';
import { color } from '@picksel/tokens';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminChrome } from '@/components/AdminChrome';
import { BackLink } from '@/components/BackLink';
import { Lede } from '@/components/Lede';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { adminPage, bodyText, card, hairline, metaLabel, mono, pageTitle } from '@/lib/theme';
import { ComplaintActions } from './ComplaintActions';

/**
 * S4.6 — one complaint.
 *
 * The evidence a decision needs, in one place: what the charity wrote, what
 * the audit actually found, and what the auditor logged live at the time. A
 * breach flagged during the encounter and one written up afterwards are
 * different things, and that difference is usually the whole answer.
 *
 * STOPS SHORT OF TND-80. That ticket names three outcomes — the finding
 * stands, ask the auditor for more, uphold it and re-audit at our cost — and
 * the last one moves a credit. `complaint.resolution` is free text and there
 * is no outcome enum, so inventing half the vocabulary here would leave a
 * schema nobody agreed to. The screen gathers the evidence; the decision stays
 * the free-text resolve that exists.
 *
 * Nothing here reaches the auditor. That separation is the product — an
 * auditor whose findings can be argued with by the charity paying for the
 * audit is not independent — so the screen says it where the reply is written.
 */
export default async function ComplaintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole('pick_admin');
  const supabase = await supabaseServer();

  const { data: complaint } = await supabase
    .from('complaint')
    .select(
      'id, subject, status, body, raised_at, resolution, audit_id, organisation_id, raised_by',
    )
    .eq('id', id)
    .maybeSingle();

  if (!complaint) notFound();

  const [{ data: organisation }, { data: raisedBy }] = await Promise.all([
    supabase.from('organisation').select('name').eq('id', complaint.organisation_id).single(),
    complaint.raised_by
      ? supabase
          .from('user_profile')
          .select('full_name')
          .eq('id', complaint.raised_by)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // What the audit found, and what was logged live during the shift. Only for
  // a complaint that names an audit; one about a fundraiser has no findings of
  // ours to stand behind.
  const [{ data: findings }, { data: observations }] = complaint.audit_id
    ? await Promise.all([
        supabase
          .from('check_result')
          .select(
            'id, outcome, note, occurred_at, check_definition(id, moment, prompt, is_critical)',
          )
          .eq('audit_id', complaint.audit_id)
          .neq('outcome', 'pass')
          .order('occurred_at', { ascending: false }),
        supabase
          .from('observation_log')
          .select('id, moment, body, severity, occurred_at')
          .eq('audit_id', complaint.audit_id)
          .order('occurred_at', { ascending: true }),
      ])
    : [{ data: null }, { data: null }];

  const route = routeFor(complaint.subject);

  return (
    <AdminChrome who={session.fullName} queuePosition={complaint.status.toUpperCase()}>
      <div style={{ ...adminPage, maxWidth: 760 }}>
        <BackLink href="/admin" label="Ops home" />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={pageTitle}>{route.title}</h1>
          <span style={metaLabel}>
            {organisation?.name ?? '—'} · {raisedBy?.full_name ?? 'unknown'}
          </span>
          <span style={{ ...metaLabel, marginLeft: 'auto', fontFamily: mono }}>
            {formatDay(new Date(complaint.raised_at))}
          </span>
        </div>

        <Lede
          tone="attention"
          meta={`${organisation?.name ?? 'A charity'} · raised ${formatDay(new Date(complaint.raised_at))}`}
          headline={
            complaint.subject === 'about_audit'
              ? 'A charity is questioning something we found.'
              : 'A charity is reporting something about a fundraiser.'
          }
          detail={
            complaint.subject === 'about_audit'
              ? 'They are asking us to stand behind a finding — which we should be able to do in a sentence.'
              : 'This is about their own agency, not about our audit.'
          }
        />

        <section style={{ ...card, padding: 18 }}>
          <div style={metaLabel}>What they wrote</div>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 14,
              lineHeight: 1.6,
              color: color.ink,
              whiteSpace: 'pre-wrap',
            }}
          >
            {complaint.body}
          </p>
        </section>

        {findings && findings.length > 0 ? (
          <section>
            <div style={{ ...metaLabel, marginBottom: 8 }}>What the audit actually says</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {findings.map((row) => {
                const definition = row.check_definition;
                if (!definition) return null;
                return (
                  <div
                    key={row.id}
                    style={{
                      ...card,
                      borderLeft: `3px solid ${
                        row.outcome === 'fail' ? color.creativeText : color.auditingText
                      }`,
                      padding: '14px 18px',
                    }}
                  >
                    <div style={{ ...metaLabel, marginBottom: 6 }}>
                      {MOMENT_LABELS[definition.moment]} ·{' '}
                      <span
                        style={{
                          color: row.outcome === 'fail' ? color.creativeText : color.auditingText,
                        }}
                      >
                        {row.outcome === 'fail' ? 'breach' : 'note'}
                      </span>
                      {definition.is_critical ? ' · critical' : ''}
                    </div>
                    <p
                      style={{
                        margin: '0 0 6px',
                        fontSize: 13.5,
                        fontWeight: 600,
                        lineHeight: 1.4,
                      }}
                    >
                      {definition.prompt}
                    </p>
                    {row.note ? (
                      <p style={{ ...bodyText, margin: 0, fontStyle: 'italic' }}>“{row.note}”</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {observations && observations.length > 0 ? (
          <section>
            <div style={{ ...metaLabel, marginBottom: 4 }}>Corroboration</div>
            <p style={{ ...bodyText, margin: '0 0 10px', maxWidth: '64ch' }}>
              Logged on the device during the shift, at the time. A finding flagged live is a
              different thing from one recalled afterwards.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {observations.map((observation) => (
                <div
                  key={observation.id}
                  style={{ display: 'flex', gap: 14, ...card, padding: '10px 16px' }}
                >
                  <span
                    style={{
                      fontFamily: mono,
                      fontSize: 11,
                      color: color.muted,
                      flex: 'none',
                      width: 46,
                    }}
                  >
                    {new Date(observation.occurred_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span style={{ ...metaLabel, width: 72, flex: 'none' }}>
                    {observation.moment ? MOMENT_LABELS[observation.moment] : '—'}
                  </span>
                  <span
                    style={{
                      ...bodyText,
                      flexGrow: 1,
                      color:
                        observation.severity === 'wrong' ? color.creativeText : color.bodyBrown,
                    }}
                  >
                    {observation.body}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {complaint.audit_id ? (
          <Link
            href={`/admin/audits/${complaint.audit_id}`}
            style={{ color: color.link, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
          >
            The whole audit →
          </Link>
        ) : null}

        {complaint.resolution ? (
          <section style={{ ...card, borderTop: `5px solid ${color.teal}`, padding: 18 }}>
            <div style={metaLabel}>How it was resolved</div>
            <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6 }}>
              {complaint.resolution}
            </p>
          </section>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p
              style={{
                ...bodyText,
                margin: 0,
                paddingTop: 12,
                borderTop: hairline,
                maxWidth: '64ch',
              }}
            >
              <strong style={{ color: color.ink }}>Nothing here reaches the auditor.</strong> An
              auditor whose findings can be argued with by the charity paying for the audit is not
              independent. If the write-up genuinely needs more, send it back from the audit itself.
            </p>
            <ComplaintActions complaintId={complaint.id} status={complaint.status} />
          </div>
        )}
      </div>
    </AdminChrome>
  );
}
