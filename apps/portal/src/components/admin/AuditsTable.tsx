import { AUDIT_TYPE_LABELS, type AuditStatus, CLIENT_STATUS } from '@picksel/core';
import { color } from '@picksel/tokens';
import Link from 'next/link';
import { StatusPill } from '@/components/StatusPill';
import { hairline, metaLabel, mono } from '@/lib/theme';

export interface AdminAuditRow {
  id: string;
  reference: string;
  status: AuditStatus;
  auditTypeLabel: string;
  charityName: string;
  postcode: string;
  windowStartOn: string;
  windowEndOn: string;
}

/**
 * Every audit, whatever state it is in.
 *
 * The directory the ops queue is not. Pure props so it renders in the fast
 * test layer — the page above does the fetching, per docs/PATTERNS.md.
 */
export function AuditsTable({ audits }: { audits: readonly AdminAuditRow[] }) {
  if (audits.length === 0) {
    return <p style={{ fontSize: 13, color: color.muted }}>Nothing booked yet.</p>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <caption style={{ ...metaLabel, textAlign: 'left', paddingBottom: 8 }}>
        Every audit, newest first
      </caption>
      <thead>
        <tr>
          {['Reference', 'Charity', 'Type', 'Location', 'Window', 'Status', ''].map((heading) => (
            <th key={heading || 'go'} scope="col" style={head}>
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {audits.map((audit) => (
          <tr key={audit.id}>
            <td style={cell}>
              <Link href={`/admin/audits/${audit.id}`} style={reference}>
                {audit.reference}
              </Link>
            </td>
            <td style={{ ...cell, fontWeight: 600 }}>{audit.charityName}</td>
            <td style={cell}>{audit.auditTypeLabel}</td>
            <td style={{ ...cell, fontFamily: mono, fontSize: 12 }}>{audit.postcode}</td>
            <td style={{ ...cell, color: color.bodyBrown, whiteSpace: 'nowrap' }}>
              {audit.windowStartOn} → {audit.windowEndOn}
            </td>
            <td style={cell}>
              <StatusPill chip={CLIENT_STATUS[audit.status]} />
            </td>
            <td style={cell}>
              {/*
                The action actually waiting. An audit nobody has accepted is
                the only kind needing a decision here rather than on its own
                page — offering one that is already assigned would be a
                second, contradictory way to do the same thing.
              */}
              {audit.status === 'booked' ? (
                <Link href={`/admin/assignment/${audit.id}`} style={reference}>
                  Assign
                </Link>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Rows arrive from Postgres; this is the one place they become props. */
export interface AuditQueryRow {
  id: string;
  reference: string;
  status: AuditStatus;
  audit_type: keyof typeof AUDIT_TYPE_LABELS;
  postcode: string;
  window_start_on: string;
  window_end_on: string;
}

export function toAdminAuditRow(row: AuditQueryRow, charityName: string): AdminAuditRow {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    auditTypeLabel: AUDIT_TYPE_LABELS[row.audit_type],
    charityName,
    postcode: row.postcode,
    windowStartOn: row.window_start_on,
    windowEndOn: row.window_end_on,
  };
}

const head = {
  ...metaLabel,
  textAlign: 'left',
  padding: '0 14px 8px 0',
  borderBottom: hairline,
  whiteSpace: 'nowrap',
} as const;

const cell = {
  padding: '11px 14px 11px 0',
  borderBottom: hairline,
  verticalAlign: 'middle',
} as const;

const reference = {
  fontFamily: mono,
  fontSize: 12,
  fontWeight: 600,
  color: color.link,
  textDecoration: 'none',
} as const;
