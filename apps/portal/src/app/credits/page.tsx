import {
  CREDIT_REASON_LABELS,
  type CreditBundle,
  type CreditEntry,
  creditsLede,
  currentBalance,
  deltaLabel,
  formatDay,
  runningBalance,
  valueLabel,
} from '@picksel/core';
import { color, radius } from '@picksel/tokens';
import { BuyCredits } from '@/components/BuyCredits';
import { Chrome } from '@/components/Chrome';
import { Lede } from '@/components/Lede';
import { clientPage } from '@/lib/client-page';
import { bodyText, clientColumn, hairline, metaLabel, mono } from '@/lib/theme';

const cell = {
  padding: '12px 16px',
  borderTop: hairline,
  borderBottom: hairline,
} as const;

/**
 * S3.5 — credits and invoices.
 *
 * An append-only ledger with a running balance beside every line. The balance
 * is never stored, so this is not a summary to be trusted — it is the sum of
 * what is shown, and a charity can add it up themselves.
 */
export default async function CreditsPage() {
  const { supabase, organisationName } = await clientPage();

  const [{ data: rows }, { data: bundleRows }] = await Promise.all([
    supabase
      .from('credit_transaction')
      .select('id, delta, reason, occurred_at, unit_price_minor_units, note, audit(reference)')
      .order('occurred_at', { ascending: false })
      .limit(200),
    supabase
      .from('credit_bundle')
      .select('quantity, price_minor_units, currency')
      .eq('is_active', true)
      .order('quantity'),
  ]);

  // Reserved vs used is the distinction a charity most often asks about: how
  // many of my credits are committed to audits that have not arrived yet.
  const { data: positionRow } = await supabase
    .from('organisation_credit_position')
    .select('purchased, consumed')
    .maybeSingle();

  // A view aggregates, so its columns are nullable to the type generator even
  // though coalesce means they never are.
  const position = positionRow
    ? { purchased: positionRow.purchased ?? 0, consumed: positionRow.consumed ?? 0 }
    : null;

  const bundles: CreditBundle[] = (bundleRows ?? []).map((row) => ({
    quantity: row.quantity,
    priceMinorUnits: row.price_minor_units,
    currency: row.currency,
  }));

  const entries: CreditEntry[] = (rows ?? []).map((row) => ({
    id: row.id,
    delta: row.delta,
    reason: row.reason,
    occurredAt: new Date(row.occurred_at),
    auditReference: row.audit?.reference ?? null,
    unitPriceMinorUnits: row.unit_price_minor_units,
    note: row.note,
  }));

  const lines = runningBalance(entries);
  const balance = currentBalance(entries);

  return (
    <Chrome active="credits" organisationName={organisationName} credits={balance}>
      <div style={clientColumn}>
        <Lede
          {...creditsLede({
            balance,
            purchased: position?.purchased ?? balance,
            consumed: position?.consumed ?? 0,
          })}
        />

        <div style={{ marginTop: 24 }}>
          <BuyCredits bundles={bundles} />
        </div>

        {lines.length === 0 ? (
          <p style={{ fontSize: 13, color: color.muted }}>No credit movements yet.</p>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: '0 8px',
              fontSize: 13,
              textAlign: 'left',
            }}
          >
            <caption style={{ textAlign: 'left', paddingBottom: 8 }}>
              <span style={{ ...metaLabel, display: 'block' }}>Every movement</span>
              <span style={{ ...bodyText, display: 'block', marginTop: 4 }}>
                Newest first. The balance on the right is the running total, so you can check ours
                against yours.
              </span>
            </caption>
            <thead>
              <tr>
                <th scope="col" style={metaLabel}>
                  Date
                </th>
                <th scope="col" style={metaLabel}>
                  Movement
                </th>
                <th scope="col" style={{ ...metaLabel, textAlign: 'right' }}>
                  Value
                </th>
                <th scope="col" style={{ ...metaLabel, textAlign: 'right' }}>
                  Credits
                </th>
                <th scope="col" style={{ ...metaLabel, textAlign: 'right' }}>
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} style={{ background: color.paper }}>
                  <td
                    style={{
                      ...cell,
                      borderLeft: hairline,
                      borderTopLeftRadius: radius.tile,
                      borderBottomLeftRadius: radius.tile,
                      fontFamily: mono,
                      color: color.muted,
                    }}
                  >
                    {formatDay(line.occurredAt)}
                  </td>
                  <td style={cell}>
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
                  </td>
                  <td style={{ ...cell, textAlign: 'right', fontFamily: mono, color: color.muted }}>
                    {valueLabel(line)}
                  </td>
                  <td
                    style={{
                      ...cell,
                      textAlign: 'right',
                      fontFamily: mono,
                      fontWeight: 700,
                      color: line.delta > 0 ? color.teal : color.bodyBrown,
                    }}
                  >
                    {deltaLabel(line.delta)}
                  </td>
                  <td
                    aria-label={`Balance after ${line.balanceAfter}`}
                    style={{
                      ...cell,
                      textAlign: 'right',
                      fontFamily: mono,
                      borderRight: hairline,
                      borderTopRightRadius: radius.tile,
                      borderBottomRightRadius: radius.tile,
                    }}
                  >
                    {line.balanceAfter}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Chrome>
  );
}
