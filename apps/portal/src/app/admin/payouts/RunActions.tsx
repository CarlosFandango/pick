'use client';

import { color, radius } from '@picksel/tokens';
import { useActionState, useState } from 'react';
import { hairline, pillButton, sans, textButton } from '@/lib/theme';
import { approveRun, executeRun, type PayoutState } from './actions';

export function RunActions({ runId, status }: { runId: string; status: string }) {
  const [approveState, approve, approving] = useActionState<PayoutState, FormData>(approveRun, {});
  const [executeState, execute, executing] = useActionState<PayoutState, FormData>(executeRun, {});
  const [open, setOpen] = useState(false);

  const error = approveState.error ?? executeState.error;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
      {status === 'draft' ? (
        <form action={approve}>
          <input type="hidden" name="runId" value={runId} />
          <button
            type="submit"
            disabled={approving}
            style={{ ...pillButton, padding: '8px 18px', fontSize: 13 }}
          >
            {approving ? 'Approving…' : 'Approve'}
          </button>
        </form>
      ) : null}

      {status === 'approved' ? (
        <>
          <button type="button" onClick={() => setOpen(!open)} style={textButton}>
            {open ? 'Cancel' : 'Mark as paid'}
          </button>
          {open ? (
            <form action={execute} style={panel}>
              <input type="hidden" name="runId" value={runId} />
              <label style={{ fontSize: 12.5, color: color.bodyBrown }}>
                What reference did the payment go out under?
                <input name="reference" required style={field} />
              </label>
              <button
                type="submit"
                disabled={executing}
                style={{ ...textButton, textAlign: 'left' }}
              >
                {executing ? 'Recording…' : 'Confirm the money has moved'}
              </button>
            </form>
          ) : null}
        </>
      ) : null}

      {error ? (
        <span role="alert" style={{ fontSize: 12.5, color: color.creativeText }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

const panel = {
  background: color.paper,
  border: hairline,
  borderRadius: radius.tile,
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  width: 300,
} as const;

const field = {
  width: '100%',
  marginTop: 4,
  border: hairline,
  borderRadius: radius.tile,
  padding: '8px 10px',
  fontFamily: sans,
  fontSize: 13,
} as const;
