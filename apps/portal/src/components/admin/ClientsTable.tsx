import { color, fontSize, fontWeight } from '@picksel/tokens';
import type { ReactNode } from 'react';
import { hairline, metaLabel, mono } from '@/lib/theme';

export interface ClientRow {
  organisationId: string;
  name: string;
  residencyZone: string;
  charityNumber: string | null;
  isActive: boolean;
  balance: number;
  auditsBooked: number;
  auditsReleased: number;
}

/**
 * The charities on the platform.
 *
 * `residencyZone` is on screen because this is the only place anyone will ever
 * look at it. It has been captured since day one and nothing consumes it —
 * showing it is how it stops being invisible until the day it matters.
 */
export function ClientsTable({
  clients,
  actions,
}: {
  clients: readonly ClientRow[];
  actions?: (client: ClientRow) => ReactNode;
}) {
  if (clients.length === 0) {
    return (
      <p style={{ fontSize: fontSize.sm, color: color.muted }}>No charities on the platform yet.</p>
    );
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSize.sm }}>
      <caption style={{ ...metaLabel, textAlign: 'left', paddingBottom: 8 }}>
        Every charity, with what it holds and what it has used
      </caption>
      <thead>
        <tr>
          {['Charity', 'Residency', 'Credits', 'Booked', 'Released', ''].map((heading) => (
            <th
              key={heading || 'actions'}
              scope="col"
              style={{
                ...metaLabel,
                textAlign: heading === 'Charity' || heading === '' ? 'left' : 'right',
                padding: '0 14px 8px 0',
                borderBottom: hairline,
                whiteSpace: 'nowrap',
              }}
            >
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {clients.map((client) => (
          <tr key={client.organisationId}>
            <td style={cell}>
              <span style={{ fontWeight: fontWeight.semibold }}>{client.name}</span>
              {client.charityNumber ? (
                <span style={{ ...metaLabel, marginLeft: 8, fontFamily: mono }}>
                  {client.charityNumber}
                </span>
              ) : null}
              {!client.isActive ? (
                <span style={{ ...metaLabel, marginLeft: 8, color: color.muted }}>INACTIVE</span>
              ) : null}
            </td>
            <td style={{ ...cell, ...right, ...metaLabel }}>
              {client.residencyZone.toUpperCase()}
            </td>
            <td style={{ ...cell, ...right, fontFamily: mono, fontWeight: fontWeight.bold }}>
              {client.balance}
            </td>
            <td style={{ ...cell, ...right, fontFamily: mono, color: color.bodyBrown }}>
              {client.auditsBooked}
            </td>
            <td style={{ ...cell, ...right, fontFamily: mono, color: color.bodyBrown }}>
              {client.auditsReleased}
            </td>
            <td style={cell}>{actions?.(client)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const cell = {
  padding: '11px 14px 11px 0',
  borderBottom: hairline,
  verticalAlign: 'top',
} as const;

const right = { textAlign: 'right' } as const;
