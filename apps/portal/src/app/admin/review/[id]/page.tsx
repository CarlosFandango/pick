import {
  AUDIT_TYPE_LABELS,
  countsLine,
  latestResults,
  momentOrder,
  momentTag,
  parseCheckOutcome,
  passesLine,
  type ReviewResult,
  reviewSummary,
} from '@picksel/core';
import { color, fontSize, fontWeight, radius } from '@picksel/tokens';
import { notFound } from 'next/navigation';
import { AdminChrome } from '@/components/AdminChrome';
import { BackLink } from '@/components/BackLink';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { hairline, metaLabel, mono } from '@/lib/theme';
import { ReviewActions } from './ReviewActions';

/** S1.7 — one held audit, three actions. */
export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole('pick_admin');
  const supabase = await supabaseServer();

  const { data: audit } = await supabase
    .from('audit')
    .select(
      'id, reference, status, audit_type, postcode, submitted_at, session_started_at, session_ended_at, client_organisation_id',
    )
    .eq('id', id)
    .maybeSingle();

  if (!audit) notFound();

  const [{ data: results }, { data: gate }, { data: organisation }, { count: queueSize }] =
    await Promise.all([
      supabase
        .from('check_result')
        .select(
          'id, check_definition_id, outcome, note, occurred_at, check_definition(id, moment, prompt, sort_order)',
        )
        .eq('audit_id', id),
      supabase.rpc('review_gate_reason', { p_audit_id: id }),
      supabase.from('organisation').select('name').eq('id', audit.client_organisation_id).single(),
      supabase.from('audit').select('id', { count: 'exact', head: true }).eq('status', 'in_review'),
    ]);

  // check_result is append-only, so a correction is another row for the same
  // check. latestResults owns which one counts, tie-break included.
  const latest = latestResults(
    (results ?? []).map((row) => ({ ...row, outcome: parseCheckOutcome(row.outcome) })),
  );

  const reviewResults: ReviewResult[] = latest.flatMap((row) => {
    const definition = row.check_definition;
    if (!definition) return [];
    const moment = definition.moment;
    return [
      {
        checkId: definition.id,
        moment,
        momentIndex: momentOrder(moment) + 1,
        prompt: definition.prompt,
        verdict: row.outcome,
        note: row.note,
      },
    ];
  });

  const summary = reviewSummary(reviewResults);

  return (
    <AdminChrome
      who={session.fullName}
      queuePosition={queueSize ? `REVIEW QUEUE · ${queueSize} HELD` : undefined}
    >
      <div style={{ padding: '24px 28px 0' }}>
        <BackLink href="/admin" label="Ops home" />
      </div>
      <div
        style={{ display: 'flex', gap: 24, padding: '16px 28px 24px', alignItems: 'flex-start' }}
      >
        <section
          style={{
            flex: 1.5,
            background: color.paper,
            border: hairline,
            borderRadius: radius.tile,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={metaLabel}>
            Write-up · {audit.reference} · {audit.postcode} {AUDIT_TYPE_LABELS[audit.audit_type]}
          </div>

          <div style={{ fontFamily: mono, fontSize: fontSize.xs, color: color.bodyBrown }}>
            {countsLine(summary) || 'No results filed'}
          </div>

          <div
            style={{
              borderTop: hairline,
              paddingTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: fontSize.sm,
            }}
          >
            {summary.exceptions.map((exception) => (
              <div key={exception.checkId} style={{ display: 'flex', gap: 12 }}>
                <span style={{ ...metaLabel, width: 78, flex: 'none' }}>
                  {momentTag(exception)}
                </span>
                <span
                  style={{
                    fontWeight: fontWeight.bold,
                    flex: 'none',
                    color: exception.verdict === 'fail' ? color.creativeText : color.auditingText,
                  }}
                >
                  {exception.verdict.toUpperCase()}
                </span>
                <span style={{ color: color.bodyBrown }}>{exception.note || exception.prompt}</span>
              </div>
            ))}

            {summary.passCount > 0 ? (
              <div style={{ display: 'flex', gap: 12, color: color.muted }}>
                <span style={{ ...metaLabel, width: 78, flex: 'none' }}>ALL OTHER</span>
                <span style={{ fontWeight: fontWeight.bold, color: color.teal, flex: 'none' }}>
                  PASS
                </span>
                <span>{passesLine(summary)}</span>
              </div>
            ) : null}
          </div>
        </section>

        <ReviewActions
          auditId={audit.id}
          gateReason={typeof gate === 'string' ? gate : null}
          organisationName={organisation?.name ?? '—'}
          submittedAt={audit.submitted_at}
        />
      </div>
    </AdminChrome>
  );
}
