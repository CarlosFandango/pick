import {
  AUDIT_TYPE_LABELS,
  type AuditMoment,
  auditorCode,
  auditorLabel,
  DEFAULT_REPORT_SETTINGS,
  encounterSequence,
  formatWindow,
  MOMENT_DESCRIPTIONS,
  MOMENT_LABELS,
  type ReportableFinding,
  reportLede,
  scoreAudit,
} from '@picksel/core';
import { color, radius } from '@picksel/tokens';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BackLink } from '@/components/BackLink';
import { Chrome } from '@/components/Chrome';
import { Lede } from '@/components/Lede';
import { SequenceCard, SequenceHeading, SequenceStep } from '@/components/Sequence';
import { requireSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { bodyText, clientColumn, hairline, metaLabel } from '@/lib/theme';

/**
 * S1.8 — the client report.
 *
 * Verdict first, then read down. The screen opens with what a fundraising
 * director came to find out — which of their fundraisers did what — and only
 * then walks the encounter in the order it happened.
 *
 * The weighted percentage is deliberately at the bottom. It was the first
 * thing on the page and it is the one number nobody outside PICK can situate:
 * 89.7% is either excellent or a disaster depending on which check was missed,
 * and the reader has no way to know which. It stays because it is the number
 * an agency will be asked about, not because it is the answer.
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
    .select(
      'id, reference, status, audit_type, postcode, released_at, client_organisation_id, window_start_on, window_end_on',
    )
    .eq('id', id)
    .maybeSingle();

  if (!audit) notFound();

  const released = audit.status === 'released';

  const [{ data: results }, { data: organisation }, { data: balance }] = await Promise.all([
    released
      ? supabase
          .from('check_result')
          .select(
            'id, outcome, note, occurred_at, check_definition(id, moment, prompt, weight, is_critical, code, compliance_category, sort_order, version, client_finding, client_rationale)',
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
  const rows = [...latest.values()];

  // What a charity is told, never the auditor's question and never our code.
  // `client_finding` is written for this; the prompt is the fallback so a check
  // added without prose renders something true rather than nothing.
  const findings: ReportableFinding[] = rows.flatMap((row) => {
    const d = row.check_definition;
    if (!d || row.outcome !== 'fail') return [];
    return [
      {
        code: d.code,
        moment: d.moment,
        finding: d.client_finding ?? d.prompt,
        rationale: d.client_rationale ?? '',
        isCritical: d.is_critical,
      },
    ];
  });

  // A NOTE is recorded but unscored, so it is neither a breach nor silence.
  const notes = rows.flatMap((row) => {
    const d = row.check_definition;
    if (!d || row.outcome !== 'note' || !row.note) return [];
    return [{ moment: d.moment, note: row.note }];
  });

  const scored = rows.filter((row) => row.outcome !== 'note');
  const checkedByMoment = new Map<AuditMoment, number>();
  for (const row of scored) {
    const moment = row.check_definition?.moment;
    if (!moment) continue;
    checkedByMoment.set(moment, (checkedByMoment.get(moment) ?? 0) + 1);
  }

  const lede = reportLede(findings, scored.length);
  const sequence = encounterSequence(checkedByMoment, findings);
  const score = scoreAudit(
    // `guidance` is auditor-facing and never fetched for a report, but the
    // scoring type expects the whole definition.
    rows.flatMap((row) => (row.check_definition ? [{ ...row.check_definition, guidance: null }] : [])),
    rows.map((row) => ({
      id: row.id,
      check_definition_id: row.check_definition?.id ?? '',
      outcome: row.outcome as never,
      occurred_at: row.occurred_at,
    })),
  );

  return (
    <Chrome
      active="reports"
      organisationName={organisation?.name ?? '—'}
      credits={balance?.balance ?? 0}
    >
      <div style={clientColumn}>
        <div style={{ marginBottom: 16 }}>
          <BackLink href={`/audits/${audit.id}`} label="Back to the audit" />
        </div>
        <div style={{ ...metaLabel, marginBottom: 8 }}>
          {audit.reference} · {AUDIT_TYPE_LABELS[audit.audit_type]} · {audit.postcode} ·{' '}
          {formatWindow(audit.window_start_on, audit.window_end_on)}
        </div>

        {!released ? (
          <Lede
            tone="waiting"
            meta="Not released"
            headline="We are still checking this write-up."
            detail="Every report is read by PICK before you see it. Nothing is needed from you."
          />
        ) : (
          <>
            <Lede {...lede} />

            <div style={{ marginTop: 30 }}>
              <SequenceHeading label="The encounter, in order">
                Our auditor watched the shift, then approached the fundraiser as a member of the
                public. This is what happened, step by step.
              </SequenceHeading>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {sequence.map((step, index) => {
                  const last = index === sequence.length - 1;
                  const gutter = `${String(step.position).padStart(2, '0')} ${step.label}`;

                  if (step.findings.length === 0) {
                    return (
                      <SequenceStep
                        key={step.moment}
                        label={gutter}
                        summary={MOMENT_DESCRIPTIONS[step.moment]}
                        note={`${step.checked} of ${step.checked} in order`}
                        last={last}
                      />
                    );
                  }

                  return (
                    <SequenceStep
                      key={step.moment}
                      label={gutter}
                      tone={step.findings.some((f) => f.isCritical) ? 'breach' : 'attention'}
                      last={last}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {step.findings.map((f) => (
                          <SequenceCard
                            key={f.code}
                            tone={f.isCritical ? 'breach' : 'attention'}
                            title={f.finding}
                            meta={
                              <>
                                <span
                                  style={{
                                    ...metaLabel,
                                    color: f.isCritical ? color.creativeText : color.auditingText,
                                  }}
                                >
                                  {f.isCritical ? 'Breach' : 'Worth a look'}
                                </span>
                                <span style={metaLabel}>
                                  {step.inOrder} of {step.checked} in order
                                </span>
                              </>
                            }
                          >
                            {f.rationale ? (
                              <p style={{ ...bodyText, margin: 0 }}>{f.rationale}</p>
                            ) : null}
                          </SequenceCard>
                        ))}
                      </div>
                    </SequenceStep>
                  );
                })}
              </div>
            </div>

            {notes.length > 0 ? (
              <section style={{ marginTop: 26 }}>
                <div style={{ ...metaLabel, marginBottom: 8 }}>Also worth knowing</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {notes.map((n) => (
                    <div
                      key={`${n.moment}-${n.note}`}
                      style={{
                        background: color.paper,
                        border: hairline,
                        borderRadius: radius.tile,
                        padding: '12px 16px',
                        display: 'flex',
                        gap: 12,
                      }}
                    >
                      <span style={{ ...metaLabel, width: 78, flex: 'none' }}>
                        {MOMENT_LABELS[n.moment]}
                      </span>
                      <span style={{ ...bodyText, margin: 0 }}>{n.note}</span>
                    </div>
                  ))}
                </div>
                <p style={{ ...bodyText, margin: '8px 0 0', fontSize: 12.5, color: color.muted }}>
                  Recorded by the auditor but not counted against the shift.
                </p>
              </section>
            ) : null}

            <div style={{ marginTop: 26, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div
                style={{
                  flexGrow: 1,
                  minWidth: 240,
                  background: color.paper,
                  border: hairline,
                  borderRadius: radius.tile,
                  padding: '15px 18px',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 11,
                }}
              >
                <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.03em' }}>
                  {scored.length}
                </span>
                <span style={{ ...bodyText, fontSize: 13 }}>
                  points of the code of practice checked
                </span>
              </div>
              <div
                style={{
                  flex: 'none',
                  width: 230,
                  background: color.paper,
                  border: hairline,
                  borderRadius: radius.tile,
                  padding: '15px 18px',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 11,
                }}
              >
                <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.03em' }}>
                  {score.overall.percentage === null ? '—' : `${score.overall.percentage}%`}
                </span>
                <span style={metaLabel}>weighted score</span>
              </div>
            </div>

            <section
              style={{
                marginTop: 24,
                padding: '20px 24px',
                background: color.navy,
                borderRadius: radius.tile,
              }}
            >
              <div style={{ ...metaLabel, color: color.onDarkMuted, marginBottom: 8 }}>
                What happens next
              </div>
              <p
                style={{
                  margin: '0 0 14px',
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: color.onDark,
                  maxWidth: '62ch',
                  textWrap: 'pretty',
                }}
              >
                Send this to your agency and ask what they will change before the next shift. If you
                think a finding is wrong, tell us — we investigate it, not the agency.
              </p>
              <Link
                href={`/complaint?audit=${audit.id}`}
                style={{
                  display: 'inline-block',
                  border: `1px solid ${color.fieldDim}`,
                  color: color.onDark,
                  borderRadius: radius.pill,
                  padding: '11px 22px',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Raise a concern
              </Link>
            </section>

            <div style={{ ...metaLabel, marginTop: 18 }}>
              {auditorLabel(DEFAULT_REPORT_SETTINGS, { code: auditorCode(audit.reference) })} ·
              independent of your agency · checked by PICK before release
            </div>
          </>
        )}
      </div>
    </Chrome>
  );
}
