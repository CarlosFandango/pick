'use client';

import { color } from '@picksel/tokens';
import { useActionState } from 'react';
import { textButton } from '@/lib/theme';
import { type GateState, updateGate } from './actions';

const MODES = ['auto_approve', 'notify', 'hold'] as const;
const SCOPES = ['payment', 'client_release', 'both'] as const;

/** Radio-style rows: one tap changes one thing, and nothing needs saving. */
export function GateControls({
  trigger,
  enabled,
  mode,
  scope,
}: {
  trigger: string;
  enabled: boolean;
  mode: string;
  scope: string;
}) {
  const [state, submit, pending] = useActionState<GateState, FormData>(updateGate, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: pending ? 0.5 : 1 }}>
      <form action={submit} style={row}>
        <input type="hidden" name="trigger" value={trigger} />
        <button
          type="submit"
          name="enabled"
          value={String(!enabled)}
          style={{ ...textButton, color: enabled ? color.teal : color.muted }}
        >
          {enabled ? 'On' : 'Off'}
        </button>
      </form>

      <form action={submit} style={row}>
        <input type="hidden" name="trigger" value={trigger} />
        {MODES.map((option) => (
          <button
            key={option}
            type="submit"
            name="mode"
            value={option}
            style={{ ...textButton, fontWeight: option === mode ? 700 : 500 }}
          >
            {option.replace('_', ' ')}
          </button>
        ))}
      </form>

      <form action={submit} style={row}>
        <input type="hidden" name="trigger" value={trigger} />
        {SCOPES.map((option) => (
          <button
            key={option}
            type="submit"
            name="scope"
            value={option}
            style={{ ...textButton, fontWeight: option === scope ? 700 : 500 }}
          >
            {option.replace('_', ' ')}
          </button>
        ))}
      </form>

      {state.error ? (
        <span role="alert" style={{ fontSize: 12.5, color: color.creativeText }}>
          {state.error}
        </span>
      ) : null}
    </div>
  );
}

const row = { display: 'flex', gap: 12, alignItems: 'center' } as const;
