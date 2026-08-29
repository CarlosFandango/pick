'use client';

import { AUDIT_TYPE_LABELS } from '@picksel/core';
import { color, radius } from '@picksel/tokens';
import { useActionState } from 'react';
import { bodyText, hairline, metaLabel, pillButton, sans } from '@/lib/theme';

export interface ApplicationState {
  error?: string;
}

/**
 * S5.2 — what an auditor tells us about themselves.
 *
 * A component rather than a page body, because a public sign-up route would
 * ask exactly these questions. When that arrives it renders this and passes a
 * different action; nothing here needs to know which door someone came in by.
 *
 * Coverage is area letters, and the field says so — an auditor who types
 * "SW1A" would be accepted by nothing and offered nothing, with no error to
 * explain the silence.
 */
export interface PlaceOption {
  id: string;
  name: string;
  region: string | null;
}

export function AuditorApplicationForm({
  action,
  email,
  places,
  needsPassword = true,
}: {
  action: (previous: ApplicationState, form: FormData) => Promise<ApplicationState>;
  email: string;
  places: PlaceOption[];
  needsPassword?: boolean;
}) {
  const [state, submit, saving] = useActionState<ApplicationState, FormData>(action, {});

  const field: React.CSSProperties = {
    fontFamily: sans,
    padding: '10px 12px',
    border: hairline,
    borderRadius: radius.tile,
    fontSize: 14,
    width: '100%',
  };

  return (
    <form action={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <span style={metaLabel}>Signing in as</span>
        <p style={{ margin: '2px 0 0', fontFamily: sans }}>{email}</p>
      </div>

      {needsPassword ? (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={metaLabel}>Choose a password</span>
          <input type="password" name="password" required minLength={8} style={field} />
          <span style={{ ...bodyText }}>At least 8 characters.</span>
        </label>
      ) : null}

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={metaLabel}>Your name</span>
        <input type="text" name="full_name" required style={field} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={metaLabel}>Where you set out from</span>
        <input type="text" name="base_postcode" required placeholder="SW1A 1AA" style={field} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={metaLabel}>Postcode areas you cover</span>
        <input type="text" name="areas" required placeholder="SW, EC, N" style={field} />
        <span style={{ ...bodyText }}>
          Letters only, separated by commas — SW, not SW1A. This is what decides which audits reach
          you.
        </span>
      </label>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ ...metaLabel, padding: 0 }}>What you can run</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 8 }}>
          {Object.entries(AUDIT_TYPE_LABELS).map(([value, label]) => (
            <label key={value} style={{ display: 'flex', gap: 6, fontFamily: sans, fontSize: 14 }}>
              <input type="checkbox" name="audit_types" value={value} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <label style={{ display: 'flex', gap: 8, fontFamily: sans, fontSize: 14 }}>
        <input type="checkbox" name="av_capable" value="yes" />I can record audio and video when a
        charity asks for it
      </label>

      {state.error ? (
        <p role="alert" style={{ ...metaLabel, color: color.creativeText, margin: 0 }}>
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        style={{ ...pillButton, alignSelf: 'flex-start', opacity: saving ? 0.5 : 1 }}
      >
        {saving ? 'Saving…' : 'Finish'}
      </button>

      <p style={{ ...bodyText, margin: 0 }}>
        PICK checks every auditor before offering work. You will not see any audits until that is
        done.
      </p>
    </form>
  );
}
