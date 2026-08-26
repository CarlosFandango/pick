import { formatMoney } from '@picksel/core';
import { color } from '@picksel/tokens';
import type { ReactNode } from 'react';
import { card, hairline, metaLabel, mono } from '@/lib/theme';

export interface PayableRow {
  auditId: string;
  reference: string;
  auditorName: string;
  amountMinorUnits: number;
  gate: string;
}

export interface PayoutRunRow {
  id: string;
  reference: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalMinorUnits: number;
  lineCount: number;
  externalReference: string | null;
}

/**
 * What is owed and not yet on a run.
 *
 * A held audit is shown but marked, rather than hidden: an operator wondering
 * why an auditor has not been paid needs to see that it is deliberate. It is
 * still left off the run itself — a run is a payment instruction, and one
 * listing money that must not move is a mistake waiting for a tired person.
 */
export function PayableList({ payable }: { payable: readonly PayableRow[] }) {
  if (payable.length === 0) {
    return <p style={{ fontSize: 13, color: color.muted }}>Nothing is owed right now.</p>;
  }

  const held = payable.filter((p) => p.gate === 'hold');
  const ready = payable.filter((p) => p.gate !== 'hold');
  const total = ready.reduce((sum, p) => sum + p.amountMinorUnits, 0);

  return (
    <section style={{ ...card, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ ...metaLabel, margin: 0 }}>Owed and not yet paid</h2>
        <span style={{ ...metaLabel, marginLeft: 'auto' }}>
          {ready.length} ready · {formatMoney(total)}
          {held.length > 0 ? ` · ${held.length} held` : ''}
        </span>
      </div>

      <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
        {[...ready, ...held].map((line) => (
          <li
            key={line.auditId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '9px 0',
              borderTop: hairline,
              opacity: line.gate === 'hold' ? 0.6 : 1,
            }}
          >
            <span style={{ fontFamily: mono, fontSize: 12 }}>{line.reference}</span>
            <span style={{ fontSize: 13 }}>{line.auditorName}</span>
            {line.gate === 'hold' ? (
              <span style={{ ...metaLabel, color: color.auditingText }}>HELD FOR REVIEW</span>
            ) : null}
            <span style={{ marginLeft: 'auto', fontFamily: mono, fontWeight: 700, fontSize: 13 }}>
              {formatMoney(line.amountMinorUnits)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Every run, and where it got to. */
export function RunList({
  runs,
  actions,
}: {
  runs: readonly PayoutRunRow[];
  actions?: (run: PayoutRunRow) => ReactNode;
}) {
  if (runs.length === 0) {
    return <p style={{ fontSize: 13, color: color.muted }}>No runs yet.</p>;
  }

  return (
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
      {runs.map((run) => (
        <li
          key={run.id}
          style={{ ...card, padding: 16, display: 'flex', gap: 18, alignItems: 'flex-start' }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: mono, fontWeight: 700, fontSize: 13 }}>
                {run.reference}
              </span>
              <span
                style={{
                  ...metaLabel,
                  color: run.status === 'executed' ? color.teal : color.auditingText,
                }}
              >
                {run.status.toUpperCase()}
              </span>
              <span style={{ ...metaLabel }}>
                {run.periodStart} → {run.periodEnd}
              </span>
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: color.bodyBrown }}>
              {run.lineCount} audit{run.lineCount === 1 ? '' : 's'} ·{' '}
              <b>{formatMoney(run.totalMinorUnits)}</b>
              {run.externalReference ? (
                <span style={{ fontFamily: mono }}> · {run.externalReference}</span>
              ) : null}
            </div>
          </div>
          {actions?.(run)}
        </li>
      ))}
    </ul>
  );
}
