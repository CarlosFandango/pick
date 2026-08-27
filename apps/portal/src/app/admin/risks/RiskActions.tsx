'use client';

import { color, fontSize, radius } from '@picksel/tokens';
import { useActionState, useState } from 'react';
import { hairline, pillButton, sans, textButton } from '@/lib/theme';
import { type AdvisoryState, adviseOnRisk, recordResponse } from './actions';

const RESPONSES = [
  { value: 'proceeded', label: 'They went ahead' },
  { value: 'withdrew', label: 'They withdrew' },
  { value: 'no_response', label: 'No response' },
] as const;

export function AdviseOnRisk({ riskId }: { riskId: string }) {
  const [state, submit, pending] = useActionState<AdvisoryState, FormData>(adviseOnRisk, {});
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button type="button" onClick={() => setOpen(!open)} style={textButton}>
        {open ? 'Cancel' : 'Record that we advised them'}
      </button>

      {open ? (
        <form action={submit} style={panel}>
          <input type="hidden" name="riskId" value={riskId} />
          <label style={label}>
            What were they told?
            <textarea name="content" required rows={3} style={field} />
          </label>
          <label style={label}>
            How?
            <input name="channel" defaultValue="email" style={field} />
          </label>
          <button
            type="submit"
            disabled={pending}
            style={{
              ...pillButton,
              padding: '9px 18px',
              fontSize: fontSize.sm,
              alignSelf: 'flex-start',
            }}
          >
            {pending ? 'Recording…' : 'Record advisory'}
          </button>
          {state.error ? (
            <span role="alert" style={{ fontSize: fontSize.xs, color: color.creativeText }}>
              {state.error}
            </span>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

export function RecordResponse({ advisoryId }: { advisoryId: string }) {
  const [, submit, pending] = useActionState<AdvisoryState, FormData>(recordResponse, {});

  return (
    <form action={submit} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <input type="hidden" name="advisoryId" value={advisoryId} />
      {RESPONSES.map((response) => (
        <button
          key={response.value}
          type="submit"
          name="response"
          value={response.value}
          disabled={pending}
          style={textButton}
        >
          {response.label}
        </button>
      ))}
    </form>
  );
}

const panel = {
  background: color.paper,
  border: hairline,
  borderRadius: radius.tile,
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  maxWidth: 460,
} as const;

const label = { fontSize: fontSize.xs, color: color.bodyBrown } as const;

const field = {
  width: '100%',
  marginTop: 4,
  border: hairline,
  borderRadius: radius.tile,
  padding: '8px 10px',
  fontFamily: sans,
  fontSize: fontSize.sm,
} as const;
