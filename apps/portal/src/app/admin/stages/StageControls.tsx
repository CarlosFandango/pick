'use client';

import { color } from '@picksel/tokens';
import { useActionState } from 'react';
import { textButton } from '@/lib/theme';
import { type StageState, updateStage } from './actions';

const FLAGS = [
  { name: 'allows_tallies', label: 'Tallies' },
  { name: 'allows_notes', label: 'Notes' },
  { name: 'allows_markers', label: 'Markers' },
] as const;

export interface StagePermissionState {
  key: string;
  isActive: boolean;
  allowsTallies: boolean;
  allowsNotes: boolean;
  allowsMarkers: boolean;
}

/**
 * One toggle per permission, each its own form. Nothing needs saving, and a
 * failed change cannot take the other two with it.
 *
 * Every toggle carries its state in words as well as colour — this is a screen
 * of on/off pairs, and on/off is exactly what colour alone cannot say.
 */
export function StageControls({ stage }: { stage: StagePermissionState }) {
  const [state, submit, pending] = useActionState<StageState, FormData>(updateStage, {});

  const value: Record<string, boolean> = {
    allows_tallies: stage.allowsTallies,
    allows_notes: stage.allowsNotes,
    allows_markers: stage.allowsMarkers,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: pending ? 0.5 : 1 }}>
      {FLAGS.map((flag) => {
        const on = value[flag.name] === true;
        return (
          <form key={flag.name} action={submit} style={row}>
            <input type="hidden" name="key" value={stage.key} />
            <span style={{ fontSize: 12.5, color: color.bodyBrown, minWidth: 64 }}>
              {flag.label}
            </span>
            <button
              type="submit"
              name={flag.name}
              value={String(!on)}
              aria-label={`${flag.label} during ${stage.key}: currently ${on ? 'allowed' : 'not allowed'}`}
              style={{
                ...textButton,
                fontWeight: 700,
                color: on ? color.teal : color.muted,
              }}
            >
              {on ? 'Allowed' : 'Not allowed'}
            </button>
          </form>
        );
      })}

      <form action={submit} style={{ ...row, marginTop: 2 }}>
        <input type="hidden" name="key" value={stage.key} />
        <span style={{ fontSize: 12.5, color: color.bodyBrown, minWidth: 64 }}>Stage</span>
        <button
          type="submit"
          name="is_active"
          value={String(!stage.isActive)}
          style={{
            ...textButton,
            fontWeight: 700,
            color: stage.isActive ? color.teal : color.muted,
          }}
        >
          {stage.isActive ? 'In use' : 'Retired'}
        </button>
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
