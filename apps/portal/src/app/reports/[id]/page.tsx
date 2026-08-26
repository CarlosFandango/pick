import {
  AUDIT_TYPE_LABELS,
  auditorCode,
  auditorLabel,
  countsLine,
  DEFAULT_REPORT_SETTINGS,
  momentOrder,
  momentTag,
  overallScore,
  parseCheckOutcome,
  type ReviewResult,
  reviewSummary,
} from '@picksel/core';
import { color, radius } from '@picksel/tokens';
import { notFound } from 'next/navigation';
import { Chrome } from '@/components/Chrome';
import { requireSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { hairline, metaLabel, mono } from '@/lib/theme';

/**
 * S1.8 — the client report.
 *
 * Only a released audit has a report. Before that the client can see the audit
 * exists — they booked it — but not what it found.
 */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const supabase = await supabaseServer();

  const { data: audit } = await supabase
    .from('audit')
    .select('id, reference, status, audit_type, postcode, released_at, client_organisation_id')
    .eq('id', id)
    .maybeSingle();

  if (!audit) notFound();

  const released = audit.status === 'released';

  const [{ data: results }, { data: organisation }, { data: balance }] = await Promise.all([
    released
      ? supabase
          .from('check_result')
          .select(
            'id, outcome, note, occurred_at, check_definition(id, moment, prompt, weight, is_critical, code)',
          )
          .eq('audit_id', id)
          .order('occurred_at', { ascending: false })
      : Promise.resolve({ data: null }),
    supabase.from('organisation').select('name').eq('id', audit.client_organisation_id).single(),
    supabase
      .from('organisation_credit_balance')
      .select('balance')
      .eq('organisation_id', session.organisationId ?? '')
      .maybeSingle(),
  ]);

  type ResultRow = NonNullable<typeof results>[number];
  const latest = new Map<string, ResultRow>();
  for (const row of results ?? []) {
    const definition = row.check_definition;
    if (!definition || latest.has(definition.id)) continue;
    latest.set(definition.id, row);
  }

  const reviewResults: ReviewResult[] = [...latest.values()].flatMap((row) => {
    const d = row.check_definition;
    if (!d) return [];
    return [
      {
        checkId: d.id,
        moment: d.moment,
        momentIndex: momentOrder(d.moment) + 1,
        prompt: d.prompt,
        verdict: parseCheckOutcome(row.outcome),
        note: row.note,
      },
    ];
  });

  const summary = reviewSummary(reviewResults);
  // overallScore, not scoreAudit: the per-category breakdown needs
  // compliance_category, and the database withholds that column from the API on
  // purpose. Nothing on this page renders a category, so nothing asks for one.
  const score = overallScore(
    [...latest.values()].flatMap((row) => (row.check_definition ? [row.check_definition] : [])),
    [...latest.values()].map((row) => ({
      id: row.id,
      check_definition_id: row.check_definition?.id ?? '',
      outcome: parseCheckOutcome(row.outcome),
      occurred_at: row.occurred_at,
    })),
  );

  return (
    <Chrome
      active="reports"
      organisationName={organisation?.name ?? '—'}
      credits={balance?.balance ?? 0}
    >
      <div style={{ padding: '26px 32px', maxWidth: 820 }}>
        <div style={metaLabel}>
          {audit.reference} · {audit.postcode} · {AUDIT_TYPE_LABELS[audit.audit_type]}
        </div>
        <h1
          style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em', margin: '8px 0 4px' }}
        >
          Audit report
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: color.muted }}>
          {auditorLabel(DEFAULT_REPORT_SETTINGS, { code: auditorCode(audit.reference) })}
        </p>

        {!released ? (
          <p
            style={{
              marginTop: 20,
              background: color.paper,
              border: hairline,
              borderRadius: radius.tile,
              padding: '14px 18px',
              fontSize: 13,
              color: color.bodyBrown,
            }}
          >
            This audit has not been released yet. Reports are checked by PICK before you see them.
          </p>
        ) : (
          <>
            <section
              style={{
                marginTop: 20,
                background: color.paper,
                border: hairline,
                borderTop: `5px solid ${score.criticalFailures.length ? color.creativeText : color.teal}`,
                borderRadius: radius.tile,
                padding: 20,
              }}
            >
              <div style={metaLabel}>Result</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 34, letterSpacing: '-0.03em' }}>
                  {score.overall.percentage === null ? '—' : `${score.overall.percentage}%`}
                </span>
                <span style={{ fontFamily: mono, fontSize: 11, color: color.bodyBrown }}>
                  {countsLine(summary)}
                </span>
              </div>

              {score.criticalFailures.length > 0 ? (
                <p style={{ margin: '10px 0 0', fontSize: 13, color: color.creativeText }}>
                  Critical: {score.criticalFailures.join(', ')} — read these before the total.
                </p>
              ) : null}
            </section>

            <section style={{ marginTop: 14 }}>
              <div style={{ ...metaLabel, marginBottom: 8 }}>What we found</div>
              {summary.exceptions.length === 0 ? (
                <p style={{ fontSize: 13, color: color.bodyBrown }}>
                  Nothing outside the code of practice was observed on this shift.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {summary.exceptions.map((exception) => (
                    <div
                      key={exception.checkId}
                      style={{
                        background: color.paper,
                        border: hairline,
                        borderRadius: radius.tile,
                        padding: '12px 16px',
                        display: 'flex',
                        gap: 12,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ ...metaLabel, width: 78, flex: 'none' }}>
                        {momentTag(exception)}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          flex: 'none',
                          color:
                            exception.verdict === 'fail' ? color.creativeText : color.auditingText,
                        }}
                      >
                        {exception.verdict.toUpperCase()}
                      </span>
                      <span style={{ color: color.bodyBrown }}>
                        {exception.prompt}
                        {exception.note ? ` — ${exception.note}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Chrome>
  );
}
