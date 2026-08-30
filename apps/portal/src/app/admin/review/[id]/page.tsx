import {
  AUDIT_TYPE_LABELS,
  formatMoment,
  MOMENT_LABELS,
  type ReviewResult,
  reviewSummary,
} from '@picksel/core';
import { color, radius } from '@picksel/tokens';
import { notFound } from 'next/navigation';
import { AdminChrome } from '@/components/AdminChrome';
import { BackLink } from '@/components/BackLink';
import { Lede } from '@/components/Lede';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { bodyText, hairline, metaLabel, mono } from '@/lib/theme';
import { ReviewActions } from './ReviewActions';

/**
 * S1.7 — one held write-up, three decisions.
 *
 * The two gates resolve SEPARATELY on screen, which is TND-79 made visible:
 * the auditor was paid on submission and nothing decided here changes that.
 * Stating it where the decision is taken is the point — a reviewer who thinks
 * they are holding someone's fee reviews differently, and an auditor whose fee
 * depended on a charity liking the result would not be independent.
 *
 * Beside the written findings, what the auditor captured LIVE, with times. A
 * critical breach flagged at 14:22 is a different thing from one remembered
 * afterwards, and that difference is most of what a reviewer is here to judge.
 */
export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole('pick_admin');
  const supabase = await supabaseServer();

  const { data: audit } = await supabase
    .from('audit')
    .select(
      'id, reference, status, audit_type, postcode, submitted_at, session_started_at, session_ended_at, client_organisation_id, auditor_id, auditor_fee_minor_units',
    )
    .eq('id', id)
    .maybeSingle();

  if (!audit) notFound();

  const [{ data: results }, { data: gate }, { data: organisation }, { count: queueSize }, { data: observations }] =
    await Promise.all([
      supabase
        .from('check_result')
        .select(
          'id, outcome, note, occurred_at, check_definition(id, moment, prompt, sort_order, is_critical, client_finding)',
        )
        .eq('audit_id', id)
        .order('occurred_at', { ascending: false }),
      supabase.rpc('review_gate_reason', { p_audit_id: id }),
      supabase.from('organisation').select('name').eq('id', audit.client_organisation_id).single(),
      supabase.from('audit').select('id', { count: 'exact', head: true }).eq('status', 'in_review'),
      // What the auditor logged during the shift. Append-only evidence, so
      // this is read in the order it happened and never edited here.
      supabase
        .from('observation_log')
        .select('id, kind, moment, body, severity, occurred_at')
        .eq('audit_id', id)
        .order('occurred_at', { ascending: true }),
    ]);

  // check_result is append-only, so the newest row per check is the current
  // one — the query orders by occurred_at descending and the first wins.
  type ResultRow = NonNullable<typeof results>[number];
  const latest = new Map<string, ResultRow>();
  for (const row of results ?? []) {
    const definition = row.check_definition;
    if (!definition || latest.has(definition.id)) continue;
    latest.set(definition.id, row);
  }

  const reviewResults: ReviewResult[] = [...latest.values()].flatMap((row) => {
    const definition = row.check_definition;
    if (!definition) return [];
    return [
      {
        checkId: definition.id,
        moment: definition.moment,
        momentIndex: Object.keys(MOMENT_LABELS).indexOf(definition.moment) + 1,
        prompt: definition.prompt,
        verdict: row.outcome as ReviewResult['verdict'],
        note: row.note,
      },
    ];
  });

  const summary = reviewSummary(reviewResults);
  const critical = new Set(
    [...latest.values()].flatMap((row) =>
      row.check_definition?.is_critical ? [row.check_definition.id] : [],
    ),
  );
  const total = reviewResults.length;
  const breaches = summary.exceptions.filter((e) => e.verdict === 'fail').length;

  return (
    <AdminChrome
      who={session.fullName}
      queuePosition={queueSize ? `REVIEW QUEUE · ${queueSize} HELD` : undefined}
    >
      <div style={{ padding: '24px 28px 0' }}>
        <BackLink href="/admin" label="Ops home" />
      </div>

      <div style={{ padding: '16px 28px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ ...metaLabel }}>
          {audit.reference} · {audit.postcode} · {AUDIT_TYPE_LABELS[audit.audit_type]} · submitted{' '}
          {audit.submitted_at ? formatMoment(new Date(audit.submitted_at)) : '—'}
        </div>

        <Lede
          tone="attention"
          meta={breaches > 0 ? `${breaches} of ${total} a breach` : `${total} checks, none a breach`}
          headline={
            typeof gate === 'string' && gate ? gate : 'Held for review before it reaches the charity.'
          }
          detail="Client release only — the auditor was paid on submission and is not waiting on you."
        />

        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 520px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* The two gates, resolved separately. TND-79 made visible. */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div
                style={{
                  flex: '1 1 240px',
                  background: color.paper,
                  border: hairline,
                  borderLeft: `3px solid ${color.teal}`,
                  borderRadius: radius.tile,
                  padding: '14px 18px',
                }}
              >
                <div style={{ ...metaLabel, color: color.teal, marginBottom: 5 }}>
                  Payment · cleared
                </div>
                <p style={{ ...bodyText, margin: 0, fontSize: 12.5 }}>
                  The auditor was paid on submission. Nothing you decide here changes that — their
                  fee never depends on a charity liking the result.
                </p>
              </div>
              <div
                style={{
                  flex: '1 1 240px',
                  background: color.paper,
                  border: hairline,
                  borderLeft: `3px solid ${color.auditingText}`,
                  borderRadius: radius.tile,
                  padding: '14px 18px',
                }}
              >
                <div style={{ ...metaLabel, color: color.auditingText, marginBottom: 5 }}>
                  Client release · held by you
                </div>
                <p style={{ ...bodyText, margin: 0, fontSize: 12.5 }}>
                  {organisation?.name ?? 'The charity'} sees nothing until you release it.
                </p>
              </div>
            </div>

            <section>
              <div style={{ ...metaLabel, marginBottom: 8 }}>
                What they found · {breaches} {breaches === 1 ? 'breach' : 'breaches'} in {total}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {summary.exceptions.map((exception) => (
                  <div
                    key={exception.checkId}
                    style={{
                      background: color.paper,
                      border: hairline,
                      borderLeft: `3px solid ${
                        exception.verdict === 'fail' ? color.creativeText : color.auditingText
                      }`,
                      borderRadius: radius.tile,
                      padding: '14px 18px',
                    }}
                  >
                    <div style={{ ...metaLabel, marginBottom: 6 }}>
                      {String(exception.momentIndex).padStart(2, '0')}{' '}
                      {MOMENT_LABELS[exception.moment]} ·{' '}
                      <span
                        style={{
                          color:
                            exception.verdict === 'fail' ? color.creativeText : color.auditingText,
                        }}
                      >
                        {exception.verdict === 'fail' ? 'breach' : 'note'}
                      </span>
                      {critical.has(exception.checkId) ? ' · critical' : ''}
                    </div>
                    {/* The auditor's own question, so a reviewer judges the
                        answer against what was asked — not against the
                        charity-facing sentence, which is a different job. */}
                    <p style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>
                      {exception.prompt}
                    </p>
                    {exception.note ? (
                      <p style={{ ...bodyText, margin: 0, fontStyle: 'italic' }}>
                        “{exception.note}”
                      </p>
                    ) : null}
                  </div>
                ))}

                {summary.passCount > 0 ? (
                  <p style={{ ...bodyText, margin: '2px 0 0', fontSize: 12.5 }}>
                    The other {summary.passCount} checks were answered and in order.
                  </p>
                ) : null}
              </div>
            </section>

            {observations && observations.length > 0 ? (
              <section>
                <div style={{ ...metaLabel, marginBottom: 8 }}>Captured during the shift</div>
                <p style={{ ...bodyText, margin: '0 0 10px', fontSize: 12.5, maxWidth: '62ch' }}>
                  Logged live, on the device, at the time. A breach corroborated here is a different
                  thing from one written up afterwards.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {observations.map((observation) => (
                    <div
                      key={observation.id}
                      style={{
                        display: 'flex',
                        gap: 14,
                        background: color.paper,
                        border: hairline,
                        borderRadius: radius.tile,
                        padding: '10px 16px',
                      }}
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
                          color: observation.severity === 'wrong' ? color.creativeText : color.bodyBrown,
                        }}
                      >
                        {observation.body}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <ReviewActions
            auditId={audit.id}
            organisationName={organisation?.name ?? '—'}
            submittedAt={audit.submitted_at}
          />
        </div>
      </div>
    </AdminChrome>
  );
}
