import { OPS_PRESENTATION, type OpsItem, waitingFor } from '@picksel/core';
import { color, fontSize, fontWeight, radius } from '@picksel/tokens';
import Link from 'next/link';
import { AdminChrome } from '@/components/AdminChrome';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { hairline, metaLabel, mono } from '@/lib/theme';

/**
 * Chip fill and its paired ink, per the design's rule that an accent used as a
 * fill needs the ink the brand pairs with it. Every value is from the drop —
 * `urgent` used to carry an invented #4A1712, which is the one thing a
 * component may never do.
 */
const TONE: Record<string, { fill?: string; ink: string }> = {
  urgent: { fill: color.creative, ink: color.creativeText },
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

  const tiles = [
    { label: 'Needs a human', value: counts?.needs_a_human ?? 0, lead: true },
    { label: 'In flight today', value: counts?.in_flight_today ?? 0 },
    { label: 'Offers awaiting accept', value: counts?.offers_awaiting ?? 0 },
    { label: 'Released this week', value: counts?.released_this_week ?? 0 },
  ];

  return (
    <AdminChrome
      who={session.fullName}
      queuePosition={now
        .toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
        .toUpperCase()}
    >
      <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 14 }}>
          {tiles.map((tile) => (
            <div
              key={tile.label}
              style={{
                flex: 1,
                background: color.paper,
                border: hairline,
                borderTop: tile.lead ? `5px solid ${color.auditing}` : hairline,
                borderRadius: radius.tile,
                padding: '14px 16px',
              }}
            >
              <div style={{ ...metaLabel, color: tile.lead ? color.auditingText : color.muted }}>
                {tile.label}
              </div>
              <div
                style={{ fontWeight: fontWeight.extrabold, fontSize: fontSize.xxl, marginTop: 2 }}
              >
                {tile.value}
              </div>
            </div>
          ))}
        </div>

        <section
          style={{
            background: color.paper,
            border: hairline,
            borderRadius: radius.tile,
            padding: '16px 20px',
          }}
        >
          <h2 style={{ ...metaLabel, margin: '0 0 10px' }}>Needs a human — worst first</h2>

          {items.length === 0 ? (
            <p style={{ margin: 0, fontSize: fontSize.sm, color: color.muted }}>
              Nothing waiting. The network is running itself.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {items.map((item, i) => {
                const presentation = OPS_PRESENTATION[item.kind];
                const tone = TONE[presentation.tone] ?? TONE.neutral;

                return (
                  <li
                    key={`${item.kind}-${item.targetId ?? i}`}
                    style={{
                      display: 'flex',
                      gap: 14,
                      alignItems: 'center',
                      padding: '11px 0',
                      borderBottom: i < items.length - 1 ? hairline : 'none',
                      fontSize: fontSize.sm,
                    }}
                  >
                    <span
                      style={{
                        background: tone?.fill ?? 'transparent',
                        border: tone?.fill ? 'none' : hairline,
                        borderRadius: radius.pill,
                        padding: '4px 10px',
                        fontFamily: mono,
                        fontSize: fontSize.xs,
                        letterSpacing: '0.1em',
                        color: tone?.ink,
                        flex: 'none',
                      }}
                    >
                      {presentation.chip}
                    </span>
                    <span style={{ flex: 1 }}>
                      <span style={{ fontFamily: mono, color: color.muted }}>{item.reference}</span>{' '}
                      · {item.summary}
                      {item.since ? (
                        <span style={{ color: color.muted }}> · {waitingFor(item, now)}</span>
                      ) : null}
                    </span>
                    {(() => {
                      const href = presentation.href(item);
                      // No link while the screen that owns this action is
                      // unbuilt. The line still says a human is needed.
                      return href ? (
                        <Link
                          href={href}
                          style={{
                            fontWeight: fontWeight.bold,
                            color: color.link,
                            textDecoration: 'none',
                          }}
                        >
                          {presentation.action} →
                        </Link>
                      ) : null;
                    })()}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AdminChrome>
  );
}
