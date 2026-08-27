import {
  CREDIT_REASON_LABELS,
  type CreditBundle,
  type CreditEntry,
  deltaLabel,
  runningBalance,
  valueLabel,
} from '@picksel/core';
import { color, fontSize, fontWeight, radius } from '@picksel/tokens';
import { BuyCredits } from '@/components/BuyCredits';
import { Chrome } from '@/components/Chrome';
import { clientPage } from '@/lib/client-page';
import { hairline, metaLabel, mono } from '@/lib/theme';

/** Most recent movements shown. The balance is never derived from this many. */
const LEDGER_PAGE = 200;

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
      .limit(LEDGER_PAGE),
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
    .select('purchased, consumed, available')
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

  // `available` folds the whole ledger; the rows below are the most recent
  // page of it. Summing the page instead would disagree with every other screen
  // the moment a charity has more movements than fit, and would start the
  // running balance from an opening figure it had silently treated as zero.
  const balance = positionRow?.available ?? 0;
  const lines = runningBalance(entries, balance);

  return (
    <Chrome active="credits" organisationName={organisationName} credits={balance}>
      <div style={{ padding: '26px 32px', maxWidth: 820 }}>
        <h1
          style={{
            fontWeight: fontWeight.extrabold,
            fontSize: fontSize.xl,
            letterSpacing: '-0.03em',
            margin: '0 0 4px',
          }}
        >
          Credits
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: fontSize.sm, color: color.muted }}>
          One credit books one audit. Credits are sold in bundles, and the price per audit falls as
          the bundle grows.
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
          <div style={metaLabel}>Available</div>
          <div
            style={{
              fontWeight: fontWeight.extrabold,
              fontSize: fontSize.xxl,
              letterSpacing: '-0.03em',
              marginTop: 4,
            }}
          >
            {balance}
          </div>
          {position ? (
            <div style={{ marginTop: 8, fontSize: fontSize.sm, color: color.bodyBrown }}>
              {position.purchased} bought · {position.consumed} used on audits you have received
              {balance !== position.purchased - position.consumed ? (
                <>
                  {' '}
                  · {position.purchased - position.consumed - balance} set aside for audits under
                  way
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <BuyCredits bundles={bundles} />

        {lines.length === 0 ? (
          <p style={{ fontSize: fontSize.sm, color: color.muted }}>No credit movements yet.</p>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: '0 8px',
              fontSize: fontSize.sm,
              textAlign: 'left',
            }}
          >
            <caption style={{ ...metaLabel, textAlign: 'left', paddingBottom: 8 }}>
              Every credit movement, newest first
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
                    {line.occurredAt.toLocaleDateString('en-GB')}
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
                      <span style={{ display: 'block', fontSize: fontSize.xs, color: color.muted }}>
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
                      fontWeight: fontWeight.bold,
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
