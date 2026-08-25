import {
  CREDIT_REASON_LABELS,
  type CreditEntry,
  currentBalance,
  deltaLabel,
  runningBalance,
  valueLabel,
} from '@picksel/core';
import { color, radius } from '@picksel/tokens';
import { Chrome } from '@/components/Chrome';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import { hairline, metaLabel, mono } from '@/lib/theme';

/**
 * S3.5 — credits and invoices.
 *
 * An append-only ledger with a running balance beside every line. The balance
 * is never stored, so this is not a summary to be trusted — it is the sum of
 * what is shown, and a charity can add it up themselves.
 */
export default async function CreditsPage() {
  const session = await requireRole('client', 'pick_admin');
  const supabase = await supabaseServer();

  const [{ data: organisation }, { data: rows }] = await Promise.all([
    supabase
      .from('organisation')
      .select('name')
      .eq('id', session.organisationId ?? '')
      .single(),
    supabase
      .from('credit_transaction')
      .select('id, delta, reason, occurred_at, unit_price_pence, note, audit(reference)')
      .order('occurred_at', { ascending: false })
      .limit(200),
  ]);

  const entries: CreditEntry[] = (rows ?? []).map((row) => ({
    id: row.id,
    delta: row.delta,
    reason: row.reason,
    occurredAt: new Date(row.occurred_at),
    auditReference: row.audit?.reference ?? null,
    unitPricePence: row.unit_price_pence,
    note: row.note,
  }));

  const lines = runningBalance(entries);
  const balance = currentBalance(entries);

  return (
    <Chrome active="credits" organisationName={organisation?.name ?? '—'} credits={balance}>
      <div style={{ padding: '26px 32px', maxWidth: 820 }}>
        <h1 style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em', margin: '0 0 4px' }}>
          Credits
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: color.muted }}>
          One credit books one audit, at £175.
        </p>

        <div
          style={{
            background: color.paper,
            border: hairline,
            borderTop: `5px solid ${color.teal}`,
            borderRadius: radius.tile,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div style={metaLabel}>Balance</div>
          <div style={{ fontWeight: 800, fontSize: 34, letterSpacing: '-0.03em', marginTop: 4 }}>
            {balance}
          </div>
        </div>

        {lines.length === 0 ? (
          <p style={{ fontSize: 13, color: color.muted }}>No credit movements yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lines.map((line) => (
              <div
                key={line.id}
                style={{
                  background: color.paper,
                  border: hairline,
                  borderRadius: radius.tile,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  fontSize: 13,
                }}
              >
                <span style={{ ...metaLabel, width: 92, flex: 'none' }}>
                  {line.occurredAt.toLocaleDateString('en-GB')}
                </span>
                <span style={{ flex: 1 }}>
                  {CREDIT_REASON_LABELS[line.reason]}
                  {line.auditReference ? (
                    <span style={{ fontFamily: mono, color: color.muted }}>
                      {' '}
                      {line.auditReference}
                    </span>
                  ) : null}
                  {line.note ? (
                    <span style={{ display: 'block', fontSize: 12, color: color.muted }}>
                      {line.note}
                    </span>
                  ) : null}
                </span>
                <span
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    color: color.muted,
                    width: 60,
                    textAlign: 'right',
                  }}
                >
                  {valueLabel(line)}
                </span>
                <span
                  style={{
                    fontFamily: mono,
                    fontWeight: 700,
                    width: 44,
                    textAlign: 'right',
                    color: line.delta > 0 ? color.teal : color.bodyBrown,
                  }}
                >
                  {deltaLabel(line.delta)}
                </span>
                <span
                  aria-label={`Balance after ${line.balanceAfter}`}
                  style={{ fontFamily: mono, width: 44, textAlign: 'right', color: color.ink }}
                >
                  {line.balanceAfter}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Chrome>
  );
}
