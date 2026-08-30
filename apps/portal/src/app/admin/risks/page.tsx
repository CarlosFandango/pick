import { formatDay, risksLede } from '@picksel/core';
import { color } from '@picksel/tokens';
import { AdminChrome } from '@/components/AdminChrome';
import { BackLink } from '@/components/BackLink';
import { Lede } from '@/components/Lede';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { adminPage, card, metaLabel, mono, pageTitle } from '@/lib/theme';
import { AdviseOnRisk, RecordResponse } from './RiskActions';

/**
 * The risk register.
 *
 * Not bookkeeping. The value is that PICK identified a risk **and advised the
 * client about it**. If a finding is later disputed or a regulator asks, the
 * defensible position is: we flagged that this auditor was becoming
 * recognisable at this agency, we advised you, you chose to proceed. Without
 * the record the same facts read as PICK quietly supplying degraded audits.
 *
 * Open risks first, because an unadvised risk is the one that costs something.
 */
export default async function RisksPage() {
  const session = await requireRole('pick_admin');
  const supabase = await supabaseServer();

  const [{ data: risks }, { data: advisories }] = await Promise.all([
    supabase
      .from('risk')
      .select('id, type, severity, subject_type, subject_id, status, detail, raised_at, raised_by')
      .order('raised_at', { ascending: false })
      .limit(100),
    supabase
      .from('risk_advisory')
      .select('id, risk_id, advised_at, channel, content, client_response')
      .order('advised_at', { ascending: false }),
  ]);

  const rows = risks ?? [];
  const open = rows.filter((r) => r.status === 'open');
  const advisedFor = new Map<
    string,
    (typeof advisories extends null ? never : NonNullable<typeof advisories>)[number]
  >();
  for (const advisory of advisories ?? []) {
    if (!advisedFor.has(advisory.risk_id)) advisedFor.set(advisory.risk_id, advisory);
  }

  // "Open" and "unadvised" are not the same thing. A risk can be open and
  // already put to the charity in writing — waiting on their answer — and that
  // is the register working, not a failure. The one that costs something is a
  // risk nobody has told them about.
  const unadvised = open.filter((risk) => !advisedFor.has(risk.id));

  return (
    <AdminChrome who={session.fullName} queuePosition={`${unadvised.length} UNADVISED`}>
      <div style={{ ...adminPage, maxWidth: 860 }}>
        <BackLink href="/admin" label="Ops home" />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={pageTitle}>Risk register</h1>
          <span style={metaLabel}>
            {rows.length} recorded · {unadvised.length} not yet advised
          </span>
        </div>

        <Lede
          {...risksLede({
            open: open.length,
            advised: rows.filter((risk) => advisedFor.has(risk.id)).length,
            unadvised: unadvised.length,
          })}
        />

        {rows.length === 0 ? (
          <p style={{ fontSize: 13, color: color.muted }}>
            Nothing recorded. Risks are raised automatically when a client overrides toward an
            auditor who has seen them recently, and by hand from here.
          </p>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {[...open, ...rows.filter((r) => r.status !== 'open')].map((risk) => {
              const advisory = advisedFor.get(risk.id);
              return (
                <li
                  key={risk.id}
                  style={{
                    ...card,
                    borderTop:
                      risk.status === 'open'
                        ? `5px solid ${color.auditing}`
                        : `1px solid ${color.oat}`,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ ...metaLabel, color: color.auditingText }}>
                      {risk.type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span style={metaLabel}>{risk.severity.toUpperCase()}</span>
                    <span style={{ ...metaLabel, color: color.muted }}>
                      {risk.status.toUpperCase()}
                    </span>
                    <span style={{ ...metaLabel, marginLeft: 'auto', fontFamily: mono }}>
                      {risk.raised_by} · {formatDay(new Date(risk.raised_at))}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: color.ink }}>
                    {risk.detail}
                  </p>

                  {advisory ? (
                    <div
                      style={{
                        borderLeft: `2px solid ${color.teal}`,
                        paddingLeft: 12,
                        fontSize: 12.5,
                        color: color.bodyBrown,
                      }}
                    >
                      <div style={metaLabel}>
                        Advised by {advisory.channel} on {formatDay(new Date(advisory.advised_at))}
                      </div>
                      <p style={{ margin: '4px 0 8px' }}>{advisory.content}</p>
                      {advisory.client_response ? (
                        <span style={{ ...metaLabel, color: color.teal }}>
                          CLIENT {advisory.client_response.replace('_', ' ').toUpperCase()}
                        </span>
                      ) : (
                        <RecordResponse advisoryId={advisory.id} />
                      )}
                    </div>
                  ) : (
                    <AdviseOnRisk riskId={risk.id} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AdminChrome>
  );
}
