'use client';

import { AUDIT_MOMENTS, MOMENT_LABELS } from '@picksel/core';
import { color, fontSize, fontWeight, radius } from '@picksel/tokens';
import { useActionState, useState } from 'react';
import { hairline, metaLabel, pillButton, sans } from '@/lib/theme';
import { type ReviewState, releaseAudit, returnToAuditor, voidAudit } from './actions';

type Panel = 'none' | 'return' | 'void';

/** The three actions. Approve is primary; the others are deliberate detours. */
export function ReviewActions({
  auditId,
  gateReason,
  organisationName,
  submittedAt,
}: {
  auditId: string;
  gateReason: string | null;
  organisationName: string;
  submittedAt: string | null;
}) {
  const [panel, setPanel] = useState<Panel>('none');
  const [releaseState, release, releasing] = useActionState<ReviewState, FormData>(
    releaseAudit,
    {},
  );
  const [returnState, sendBack] = useActionState<ReviewState, FormData>(returnToAuditor, {});
  const [voidState, discard] = useActionState<ReviewState, FormData>(voidAudit, {});

  const error = releaseState.error ?? returnState.error ?? voidState.error;

  return (
    <aside style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, fontFamily: sans }}>
      {gateReason ? (
        <div
          style={{
            background: color.paper,
            border: hairline,
            borderTop: `5px solid ${color.auditing}`,
            borderRadius: radius.tile,
            padding: 16,
          }}
        >
          <div style={{ ...metaLabel, marginBottom: 6 }}>Why it&rsquo;s held</div>
          <p style={{ margin: 0, fontSize: fontSize.sm, lineHeight: 1.55, color: color.bodyBrown }}>
            {gateReason}
          </p>
        </div>
      ) : null}

      <div
        style={{
          background: color.paper,
          border: hairline,
          borderRadius: radius.tile,
          padding: 16,
          fontSize: fontSize.xs,
          lineHeight: 1.7,
          color: color.bodyBrown,
        }}
      >
        <div style={{ ...metaLabel, marginBottom: 6 }}>Audit</div>
        Booked by {organisationName}
        {submittedAt ? <> · submitted {new Date(submittedAt).toLocaleString('en-GB')}</> : null}
      </div>

      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: fontSize.sm, color: color.creativeText }}>
          {error}
        </p>
      ) : null}

      <form action={release}>
        <input type="hidden" name="auditId" value={auditId} />
        <button type="submit" disabled={releasing} style={{ ...pillButton, width: '100%' }}>
          {releasing ? 'Releasing…' : 'Approve & release to client'}
        </button>
      </form>

      <div style={{ display: 'flex', gap: 22, justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => setPanel(panel === 'return' ? 'none' : 'return')}
          style={linkButton(color.ink)}
        >
          Return to auditor
        </button>
        <button
          type="button"
          onClick={() => setPanel(panel === 'void' ? 'none' : 'void')}
          style={linkButton(color.creativeText)}
        >
          Void the audit
        </button>
      </div>

      {panel === 'return' ? (
        <form action={sendBack} style={panelStyle}>
          <input type="hidden" name="auditId" value={auditId} />
          <div style={metaLabel}>Which moments need rework?</div>
          {AUDIT_MOMENTS.map((moment) => (
            <label key={moment} style={{ display: 'flex', gap: 8, fontSize: fontSize.sm }}>
              <input type="checkbox" name="moment" value={moment} />
              {MOMENT_LABELS[moment]}
            </label>
          ))}
          <textarea name="note" placeholder="What needs changing?" style={inputStyle} />
          <button type="submit" style={{ ...pillButton, background: color.navy }}>
            Return to auditor
          </button>
        </form>
      ) : null}

      {panel === 'void' ? (
        <form action={discard} style={panelStyle}>
          <input type="hidden" name="auditId" value={auditId} />
          <div style={metaLabel}>Why is this audit unusable?</div>
          <textarea name="reason" required placeholder="Reason" style={inputStyle} />
          <p style={{ margin: 0, fontSize: fontSize.xs, color: color.muted }}>
            The client&rsquo;s credit is returned automatically.
          </p>
          <button type="submit" style={{ ...pillButton, background: color.creativeText }}>
            Void the audit
          </button>
        </form>
      ) : null}
    </aside>
  );
}

const linkButton = (colour: string) =>
  ({
    background: 'none',
    border: 'none',
    borderBottom: `1.5px solid ${colour}`,
    color: colour,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
    padding: '0 0 2px',
    cursor: 'pointer',
    fontFamily: sans,
  }) as const;

const panelStyle = {
  background: color.paper,
  border: hairline,
  borderRadius: radius.tile,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
} as const;

const inputStyle = {
  border: hairline,
  borderRadius: radius.tile,
  padding: 10,
  fontSize: fontSize.sm,
  fontFamily: sans,
  minHeight: 60,
} as const;
