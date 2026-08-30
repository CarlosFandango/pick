import {
  AUDIT_TYPE_LABELS,
  type AuditGroup,
  type AuditStatus,
  dashboardLede,
  formatDay,
  formatWindow,
  groupAudits,
  groupOf,
  parseAuditStatus,
} from '@picksel/core';
import { color, radius } from '@picksel/tokens';
import Link from 'next/link';
import { AuditRow } from '@/components/AuditRow';
import { Chrome } from '@/components/Chrome';
import { Lede } from '@/components/Lede';
import { clientPage } from '@/lib/client-page';
import { bodyText, clientColumn, hairline, metaLabel, mono } from '@/lib/theme';

/**
 * S1.9 / S3.3 — the charity's list of audits.
 *
 * Grouped by what each group MEANS to them, not by our status enum and not by
 * created_at. A fundraising director arrives with one question — is anything
 * waiting on me — and the old table made them read eight rows and know our
 * vocabulary to answer it.
 *
 * Exactly one group ever contains an action. The other three exist to stop
 * somebody worrying, which is a real job for a screen even when nothing in it
 * is clickable.
 */

/** The gutter word for a row: short, and in the charity's language. */
function stateWord(status: AuditStatus, hasAuditor: boolean): string {
  switch (status) {
    case 'released':
      return 'Released';
    case 'in_review':
      return 'Being checked';
    case 'in_progress':
      return 'Being worked';
    case 'assigned':
      return 'Auditor found';
    case 'no_team_present':
      return 'No team';
    case 'cancelled':
      return 'Cancelled';
    default:
      return hasAuditor ? 'Auditor found' : 'Booked';
  }
}

const TONES: Record<AuditGroup, 'good' | 'progress' | 'neutral' | 'attention'> = {
  ready: 'good',
  underway: 'progress',
  waiting: 'neutral',
  finished: 'neutral',
};

export default async function AuditsPage({
  searchParams,
}: {
  searchParams: Promise<{ booked?: string }>;
}) {
  const { booked } = await searchParams;
  const { supabase, organisationName, credits } = await clientPage();

  const { data: rows } = await supabase
    .from('audit')
    .select(
      'id, reference, status, audit_type, postcode, window_start_on, window_end_on, auditor_id, released_at, report_read_at',
    )
    .order('window_start_on', { ascending: true })
    .limit(100);

  const audits = (rows ?? []).map((row) => ({
    ...row,
    status: parseAuditStatus(row.status),
    readAt: row.report_read_at,
  }));

  const groups = groupAudits(audits);
  const counts = { ready: 0, underway: 0, waiting: 0, finished: 0 } as Record<AuditGroup, number>;
  for (const audit of audits) counts[groupOf(audit)] += 1;
  const lede = dashboardLede(counts);
  const firstReady = groups.find((g) => g.group === 'ready')?.audits[0];

  return (
    <Chrome active="audits" organisationName={organisationName} credits={credits}>
      <div style={clientColumn}>
        {booked ? (
          <p
            style={{
              margin: '0 0 16px',
              background: color.paper,
              border: hairline,
              borderTop: `5px solid ${color.teal}`,
              borderRadius: radius.tile,
              padding: '14px 18px',
              fontSize: 13,
            }}
          >
            Booked as <b style={{ fontFamily: mono }}>{booked}</b>. We will match it to an auditor
            who covers the area.
          </p>
        ) : null}

        <Lede {...lede}>
          {firstReady ? (
            <Link
              href={`/reports/${firstReady.id}`}
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
              {counts.ready === 1 ? 'Read it' : 'Read the first'}
            </Link>
          ) : null}
        </Lede>

        {groups.length === 0 ? (
          <p style={{ ...bodyText, marginTop: 22 }}>Nothing booked yet.</p>
        ) : (
          groups.map((group) => (
            <section key={group.group} style={{ marginTop: 26 }}>
              <div style={{ ...metaLabel, marginBottom: 8 }}>{group.label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {group.audits.map((audit) => (
                  <AuditRow
                    key={audit.id}
                    href={
                      audit.status === 'released' ? `/reports/${audit.id}` : `/audits/${audit.id}`
                    }
                    tone={TONES[group.group]}
                    state={stateWord(audit.status, Boolean(audit.auditor_id))}
                    title={`${AUDIT_TYPE_LABELS[audit.audit_type]} · ${audit.postcode}`}
                    subtitle={subtitleFor(audit)}
                    trailing={
                      group.group === 'ready' ? (
                        <span style={{ fontWeight: 700, color: color.link }}>Read report</span>
                      ) : audit.status === 'released' ? (
                        'Read report'
                      ) : (
                        `Window ${formatWindow(audit.window_start_on, audit.window_end_on)}`
                      )
                    }
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </Chrome>
  );
}

/**
 * The line under the title. Says the most recent true thing about the audit,
 * because a charity reading down wants to know where it got to, not a date
 * they already chose.
 */
function subtitleFor(audit: {
  status: AuditStatus;
  released_at: string | null;
  report_read_at: string | null;
  auditor_id: string | null;
  window_start_on: string | null;
  window_end_on: string | null;
}): string {
  if (audit.status === 'released' && audit.released_at) {
    const released = `Released ${formatDay(new Date(audit.released_at))}`;
    return audit.report_read_at
      ? `${released} · read ${formatDay(new Date(audit.report_read_at))}`
      : released;
  }
  if (audit.status === 'no_team_present') {
    return 'Nobody was fundraising · your credit was returned';
  }
  if (audit.status === 'cancelled') return 'Your credit was returned';
  if (audit.status === 'in_review') return 'With PICK since the write-up came in';
  if (audit.status === 'in_progress') return 'An auditor is on site';
  if (audit.auditor_id) return 'An auditor has accepted';
  return 'We are matching this to an auditor who covers the area';
}
