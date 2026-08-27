'use client';

import { color, fontSize, radius } from '@picksel/tokens';
import { useActionState } from 'react';
import { hairline, pillButton, sans, textButton } from '@/lib/theme';
import { type ComplaintState, updateComplaint } from './actions';

export function ComplaintActions({ complaintId, status }: { complaintId: string; status: string }) {
  const [state, submit, pending] = useActionState<ComplaintState, FormData>(updateComplaint, {});

  if (status === 'resolved' || status === 'withdrawn') return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {status === 'open' ? (
        <form action={submit}>
          <input type="hidden" name="complaintId" value={complaintId} />
          <input type="hidden" name="status" value="acknowledged" />
          <button type="submit" disabled={pending} style={{ ...textButton }}>
            {pending ? 'Acknowledging…' : 'Acknowledge — tell them we have it'}
          </button>
        </form>
      ) : null}

      <form
        action={submit}
        style={{
          background: color.paper,
          border: hairline,
          borderRadius: radius.tile,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <input type="hidden" name="complaintId" value={complaintId} />
        <input type="hidden" name="status" value="resolved" />
        <label style={{ fontSize: fontSize.xs, color: color.bodyBrown }}>
          How was it resolved? The charity will be told this.
          <textarea
            name="resolution"
            required
            rows={3}
            style={{
              width: '100%',
              marginTop: 4,
              border: hairline,
              borderRadius: radius.tile,
              padding: '8px 10px',
              fontFamily: sans,
              fontSize: fontSize.sm,
            }}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          style={{
            ...pillButton,
            padding: '10px 20px',
            fontSize: fontSize.sm,
            alignSelf: 'flex-start',
          }}
        >
          {pending ? 'Resolving…' : 'Resolve'}
        </button>
      </form>

      {state.error ? (
        <span role="alert" style={{ fontSize: fontSize.xs, color: color.creativeText }}>
          {state.error}
        </span>
      ) : null}
    </div>
  );
}
