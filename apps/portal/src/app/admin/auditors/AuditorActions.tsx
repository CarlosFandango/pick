'use client';

import { color, radius } from '@picksel/tokens';
import { useActionState, useState } from 'react';
import { hairline, pillButton, sans, textButton } from '@/lib/theme';
import { type AuditorState, approveAuditor, suspendAuditor } from './actions';

/**
 * Approve is one click. Suspending is not.
 *
 * The same shape as the review screen: the reversible action is a button, and
 * the one that stops someone earning is a deliberate detour with a reason
 * attached, because "why" is the part that will matter later.
 */
export function AuditorActions({ auditorId, status }: { auditorId: string; status: string }) {
  const [approveState, approve, approving] = useActionState<AuditorState, FormData>(
    approveAuditor,
    {},
  );
  const [suspendState, suspend, suspending] = useActionState<AuditorState, FormData>(
    suspendAuditor,
    {},
  );
  const [open, setOpen] = useState(false);

  const error = approveState.error ?? suspendState.error;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        {status !== 'approved' ? (
          <form action={approve}>
            <input type="hidden" name="auditorId" value={auditorId} />
            <button
              type="submit"
              disabled={approving}
              style={{
                ...pillButton,
                padding: '8px 18px',
                fontSize: 13,
                opacity: approving ? 0.5 : 1,
              }}
            >
              {approving ? 'Approving…' : 'Approve'}
            </button>
          </form>
        ) : null}

        {status !== 'suspended' ? (
          <button type="button" onClick={() => setOpen(!open)} style={textButton}>
            {open ? 'Cancel' : 'Suspend'}
          </button>
        ) : null}
      </div>

      {open ? (
        <form
          action={suspend}
          style={{
            background: color.paper,
            border: hairline,
            borderRadius: radius.tile,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            width: 280,
          }}
        >
          <input type="hidden" name="auditorId" value={auditorId} />
          <label style={{ fontSize: 12.5, color: color.bodyBrown }}>
            Why are they being suspended?
            <input
              name="reason"
              required
              style={{
                width: '100%',
                marginTop: 4,
                border: hairline,
                borderRadius: radius.tile,
                padding: '8px 10px',
                fontFamily: sans,
                fontSize: 13,
              }}
            />
          </label>
          <button type="submit" disabled={suspending} style={{ ...textButton, textAlign: 'left' }}>
            {suspending ? 'Suspending…' : 'Confirm suspension'}
          </button>
        </form>
      ) : null}

      {error ? (
        <span role="alert" style={{ fontSize: 12.5, color: color.creativeText }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
