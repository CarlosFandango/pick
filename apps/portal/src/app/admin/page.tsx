import {
  formatDay,
  isOverdue,
  OPS_PRESENTATION,
  type OpsItem,
  opsLede,
  waitingFor,
} from '@picksel/core';
import { color, radius } from '@picksel/tokens';
import Link from 'next/link';
import { AdminChrome } from '@/components/AdminChrome';
import { Lede } from '@/components/Lede';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { adminPage, bodyText, hairline, metaLabel, mono } from '@/lib/theme';

const TONE: Record<string, { fill?: string; ink: string }> = {
  // `ink` on the creative fill measures 5.62:1. The raw hex that was here
  // (#4A1712) was the only colour in the portal that was not a token.
  urgent: { fill: color.creative, ink: color.ink },
  attention: { fill: color.auditing, ink: color.auditingInk },
  info: { fill: color.navy, ink: color.onDarkMuted },
  neutral: { ink: color.muted },
};

/**
 * S4.1 — ops home.
 *
 * Today is a queue, not a dashboard. Everything urgent lands in one ranked
 * list with the action inline, and four counters are the entire summary. This
 * is a cockpit for two people, not a BI tool.
 */
export default async function OpsHomePage() {
  const session = await requireRole('pick_admin');
  const supabase = await supabaseServer();
  const now = new Date();

  const [{ data: queue }, { data: counters }] = await Promise.all([
    supabase.rpc('ops_queue'),
    supabase.rpc('ops_counters'),
  ]);

  const items: OpsItem[] = (queue ?? []).map((row) => ({
    kind: row.kind,
    reference: row.reference,
    summary: row.summary,
    targetId: row.target_id,
    since: row.since ? new Date(row.since) : null,
  }));

  const counts = Array.isArray(counters) ? counters[0] : counters;

  // Subordinate to the queue, and deliberately below it. Two people running a
  // marketplace need to know whether today is normal before they need to know
  // that six audits are in flight.
  const network = [
    { label: 'Audits in flight', value: counts?.in_flight_today ?? 0 },
    { label: 'Offers awaiting accept', value: counts?.offers_awaiting ?? 0 },
    { label: 'Released this week', value: counts?.released_this_week ?? 0 },
  ];

  return (
    <AdminChrome who={session.fullName} queuePosition={formatDay(now).toUpperCase()}>
      <div style={adminPage}>
        <Lede {...opsLede(items, now)} />

        {items.length === 0 ? null : (
          <section>
            <div style={{ ...metaLabel, marginBottom: 8 }}>
              Worst first · clear this list and the day is done
            </div>
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {items.map((item, i) => {
                const presentation = OPS_PRESENTATION[item.kind];
                const overdue = isOverdue(item, now);
                const tone = overdue ? TONE.urgent : (TONE[presentation.tone] ?? TONE.neutral);

                return (
                  <li
                    key={`${item.kind}-${item.targetId ?? i}`}
                    style={{
                      display: 'flex',
                      gap: 16,
                      alignItems: 'center',
                      background: color.paper,
                      border: hairline,
                      // The rail is the only place overdue is stated at full
                      // strength; the chip beside it carries the word, because
                      // colour on its own is not a message.
                      borderLeft: `3px solid ${overdue ? color.creativeText : (tone?.fill ?? color.oat)}`,
                      borderRadius: radius.tile,
                      padding: '13px 18px',
                    }}
                  >
                    <span
                      style={{
                        ...metaLabel,
                        color: overdue ? color.creativeText : color.muted,
                        width: 92,
                        flex: 'none',
                      }}
                    >
                      {overdue ? 'Overdue' : waitingFor(item, now) || presentation.chip}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 14,
                          fontWeight: 600,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {presentation.title}
                      </span>
                      <span style={{ ...bodyText, display: 'block', fontSize: 12.5 }}>
                        <span style={{ fontFamily: mono }}>{item.reference}</span> · {item.summary}
                      </span>
                    </span>
                    <Link
                      href={presentation.href(item)}
                      style={{
                        flex: 'none',
                        background: overdue ? color.creativeText : color.teal,
                        color: color.bone,
                        borderRadius: radius.pill,
                        padding: '9px 20px',
                        fontSize: 12.5,
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      {presentation.action}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section style={{ marginTop: 8 }}>
          <div style={{ ...metaLabel, marginBottom: 8 }}>The network, right now</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {network.map((tile) => (
              <div
                key={tile.label}
                style={{
                  flex: 1,
                  minWidth: 180,
                  background: color.paper,
                  border: hairline,
                  borderRadius: radius.tile,
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 11,
                }}
              >
                <span style={{ fontWeight: 800, fontSize: 21, letterSpacing: '-0.03em' }}>
                  {tile.value}
                </span>
                <span style={{ ...bodyText, fontSize: 12.5 }}>{tile.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminChrome>
  );
}
