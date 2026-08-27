'use client';

import { color, fontSize, radius } from '@picksel/tokens';
import { useActionState, useState } from 'react';
import { hairline, sans, textButton } from '@/lib/theme';
import { type AdjustState, adjustCredits } from './actions';

/**
 * Deliberately a detour, not an inline stepper.
 *
 * Credits are money. This writes a permanent row on an append-only ledger the
 * charity can read, so it asks for an amount and a reason rather than offering
 * a plus and a minus button next to a number.
 */
export function AdjustCredits({ organisationId, name }: { organisationId: string; name: string }) {
  const [state, submit, pending] = useActionState<AdjustState, FormData>(adjustCredits, {});
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
      <button type="button" onClick={() => setOpen(!open)} style={textButton}>
        {open ? 'Cancel' : 'Adjust credits'}
      </button>

      {open ? (
        <form
          action={submit}
          style={{
            background: color.paper,
            border: hairline,
            borderRadius: radius.tile,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            width: 300,
          }}
        >
          <input type="hidden" name="organisationId" value={organisationId} />
          <label style={{ fontSize: fontSize.xs, color: color.bodyBrown }}>
            Credits to add or remove for {name}
            <input name="delta" type="number" step="1" required style={input} />
          </label>
          <label style={{ fontSize: fontSize.xs, color: color.bodyBrown }}>
            Why
            <input name="reason" required style={input} />
          </label>
          <button type="submit" disabled={pending} style={{ ...textButton, textAlign: 'left' }}>
            {pending ? 'Recording…' : 'Record on the ledger'}
          </button>
        </form>
      ) : null}

      {state.error ? (
        <span role="alert" style={{ fontSize: fontSize.xs, color: color.creativeText }}>
          {state.error}
        </span>
      ) : null}
      {state.done ? (
        <span style={{ fontSize: fontSize.xs, color: color.teal }}>{state.done}</span>
      ) : null}
    </div>
  );
}

const input = {
  width: '100%',
  marginTop: 4,
  border: hairline,
  borderRadius: radius.tile,
  padding: '8px 10px',
  fontFamily: sans,
  fontSize: fontSize.sm,
} as const;
