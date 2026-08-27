import { color, fontSize, fontWeight } from '@picksel/tokens';
import type { ReactNode } from 'react';
import { card, metaLabel, mono } from '@/lib/theme';

export interface AuditorRow {
  auditorId: string;
  fullName: string;
  approvalStatus: string;
  basePostcode: string | null;
  avCapable: boolean;
  areas: readonly string[];
  methodologies: readonly string[];
  auditsCompleted: number;
  openConflicts: number;
}

/**
 * The auditor roster.
 *
 * Pending first, always: this is a queue before it is a directory, and an
 * unapproved auditor is never offered anything, so nothing in the network
 * moves until someone looks.
 *
 * Real names deliberately. Coded identities exist to stop a *charity*
 * building a picture of an individual over time; PICK is the party doing the
 * vetting and cannot do it against a hash.
 */
export function AuditorRoster({
  auditors,
  actions,
}: {
  auditors: readonly AuditorRow[];
  /** The controls, injected so this stays a server-renderable pure component. */
  actions?: (auditor: AuditorRow) => ReactNode;
}) {
  if (auditors.length === 0) {
    return (
      <p style={{ fontSize: fontSize.sm, color: color.muted }}>
        Nobody has applied yet. Auditors appear here as soon as they sign up.
      </p>
    );
  }

  const pendingFirst = [
    ...auditors.filter((a) => a.approvalStatus === 'pending'),
    ...auditors.filter((a) => a.approvalStatus !== 'pending'),
  ];

  return (
    <ul style={list}>
      {pendingFirst.map((auditor) => (
        <li
          key={auditor.auditorId}
          style={{
            ...card,
            borderTop:
              auditor.approvalStatus === 'pending'
                ? `5px solid ${color.auditing}`
                : `1px solid ${color.oat}`,
            padding: 16,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 18,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontWeight: fontWeight.bold, fontSize: fontSize.md }}>
                {auditor.fullName}
              </span>
              <span
                style={{
                  ...metaLabel,
                  color: auditor.approvalStatus === 'approved' ? color.teal : color.auditingText,
                }}
              >
                {auditor.approvalStatus.toUpperCase()}
              </span>
            </div>

            <div style={{ marginTop: 6, fontSize: fontSize.sm, color: color.bodyBrown }}>
              {auditor.auditsCompleted} completed
              {auditor.openConflicts > 0 ? (
                // A conflict is a hard block on assignment and never waivable.
                // Surfaced here because it explains why someone is idle.
                <>
                  {' · '}
                  <b>{auditor.openConflicts} declared conflict(s)</b>
                </>
              ) : null}
              {auditor.avCapable ? ' · A/V capable' : ''}
            </div>

            <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Fact label="Areas" mono>
                {auditor.areas.length ? auditor.areas.join(' ') : 'none set'}
              </Fact>
              <Fact label="Methodologies">
                {auditor.methodologies.length ? auditor.methodologies.join(', ') : 'none set'}
              </Fact>
              <Fact label="Based">{auditor.basePostcode ?? '—'}</Fact>
            </div>
          </div>

          {actions?.(auditor)}
        </li>
      ))}
    </ul>
  );
}

/** Coverage and capability are why someone is or is not matched. */
function Fact({
  label,
  children,
  mono: isMono,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <span style={{ fontSize: fontSize.xs }}>
      <span style={{ ...metaLabel, marginRight: 6 }}>{label}</span>
      <span style={{ fontFamily: isMono ? mono : undefined, color: color.bodyBrown }}>
        {children}
      </span>
    </span>
  );
}

const list = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
} as const;
