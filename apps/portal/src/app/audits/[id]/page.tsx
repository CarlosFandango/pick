import {
  AUDIT_TYPE_LABELS,
  auditTimeline,
  formatDay,
  formatWindow,
  parseAuditStatus,
  SHIFT_PAYMENT_LABELS,
  waitingLede,
} from '@picksel/core';
import { color, radius } from '@picksel/tokens';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BackLink } from '@/components/BackLink';
import { Chrome } from '@/components/Chrome';
import { Lede } from '@/components/Lede';
import { SequenceHeading, SequenceStep } from '@/components/Sequence';
import { clientPage } from '@/lib/client-page';
import { bodyText, clientColumn, metaLabel } from '@/lib/theme';

/**
 * S3.3 — one audit, while the charity waits for it.
 *
 * The question here is not "what did it find" — there is nothing to find yet
 * — but "is anything expected of me", and the answer is almost always no.
 * Saying so in a sentence is the whole job of the top of this screen; a status
 * chip is the end state with the story taken out.
 *
 * Under it, how the audit has gone: derived from the timestamps the row
 * already carries, which no screen was reading.
 */
export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, organisationName, credits } = await clientPage();

  const { data: audit } = await supabase
    .from('audit')
    .select(
      'id, reference, status, audit_type, shift_payment_method, postcode, window_start_on, window_end_on, requires_av, released_at, auditor_id, created_at, matched_at, started_at, submitted_at, returned_at, no_team_present_at, cancelled_at, report_read_at',
    )
    .eq('id', id)
    .maybeSingle();

  if (!audit) notFound();

  const status = parseAuditStatus(audit.status);
  const windowLabel = formatWindow(audit.window_start_on, audit.window_end_on);

  const lede = waitingLede({
    status,
    windowStartOn: audit.window_start_on,
    windowEndOn: audit.window_end_on,
    hasAuditor: Boolean(audit.auditor_id),
  });

  const events = auditTimeline({
    status,
    createdAt: audit.created_at,
    matchedAt: audit.matched_at,
    startedAt: audit.started_at,
    submittedAt: audit.submitted_at,
    returnedAt: audit.returned_at,
    releasedAt: audit.released_at,
    noTeamPresentAt: audit.no_team_present_at,
    cancelledAt: audit.cancelled_at,
    reportReadAt: audit.report_read_at,
    windowLabel,
    auditTypeLabel: AUDIT_TYPE_LABELS[audit.audit_type],
  });

  return (
    <Chrome active="audits" organisationName={organisationName} credits={credits}>
      <div style={clientColumn}>
        <div style={{ marginBottom: 16 }}>
          <BackLink href="/audits" label="All audits" />
        </div>
        <div style={{ ...metaLabel, marginBottom: 8 }}>
          {audit.reference} · {AUDIT_TYPE_LABELS[audit.audit_type]} · {audit.postcode} ·{' '}
          {SHIFT_PAYMENT_LABELS[audit.shift_payment_method]}
          {audit.requires_av ? ' · A/V required' : ''}
        </div>

        {status === 'released' ? (
          <Lede
            tone="clear"
            meta="Report ready"
            headline="Your report is ready to read."
            detail="It has been checked by PICK. Nothing else is needed from you."
          >
            <Link
              href={`/reports/${audit.id}`}
              style={{
                display: 'inline-block',
                background: color.teal,
                color: color.bone,
                borderRadius: radius.pill,
                padding: '11px 24px',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Read the report
            </Link>
          </Lede>
        ) : (
          <Lede {...lede} />
        )}

        <div style={{ marginTop: 30 }}>
          <SequenceHeading label="How this audit has gone">
            The window you booked was {windowLabel}.
          </SequenceHeading>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {events.map((event, index) => (
              <SequenceStep
                key={event.key}
                label={event.tone === 'now' ? 'Now' : formatDay(new Date(event.at))}
                tone={
                  event.tone === 'attention'
                    ? 'attention'
                    : event.tone === 'now'
                      ? 'clear'
                      : 'neutral'
                }
                last={index === events.length - 1}
              >
                <div style={{ paddingTop: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
                    {event.title}
                  </div>
                  {event.detail ? (
                    <p style={{ ...bodyText, margin: '3px 0 0', maxWidth: '58ch' }}>
                      {event.detail}
                    </p>
                  ) : null}
                </div>
              </SequenceStep>
            ))}
          </div>
        </div>
      </div>
    </Chrome>
  );
}
