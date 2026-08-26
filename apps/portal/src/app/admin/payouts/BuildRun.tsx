'use client';

import { color, radius } from '@picksel/tokens';
import { useActionState } from 'react';
import { hairline, pillButton, sans } from '@/lib/theme';
import { buildRun, type PayoutState } from './actions';

/** A period, and a draft run built from everything payable inside it. */
export function BuildRun({
  defaultStart,
  defaultEnd,
}: {
  defaultStart: string;
  defaultEnd: string;
}) {
  const [state, submit, pending] = useActionState<PayoutState, FormData>(buildRun, {});

  return (
    <form action={submit} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
      <label style={label}>
        From
        <input type="date" name="periodStart" defaultValue={defaultStart} required style={field} />
      </label>
      <label style={label}>
        To
        <input type="date" name="periodEnd" defaultValue={defaultEnd} required style={field} />
      </label>
      <button
        type="submit"
        disabled={pending}
        style={{ ...pillButton, padding: '10px 20px', fontSize: 13 }}
      >
        {pending ? 'Building…' : 'Draft a run'}
      </button>
      {state.error ? (
        <span role="alert" style={{ fontSize: 12.5, color: color.creativeText }}>
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

const label = {
  fontSize: 12.5,
  color: color.bodyBrown,
  display: 'flex',
  flexDirection: 'column',
} as const;

const field = {
  marginTop: 4,
  border: hairline,
  borderRadius: radius.tile,
  padding: '8px 10px',
  fontFamily: sans,
  fontSize: 13,
} as const;
