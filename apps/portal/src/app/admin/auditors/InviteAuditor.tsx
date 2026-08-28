'use client';

import { color, radius } from '@picksel/tokens';
import { useActionState } from 'react';
import { bodyText, hairline, metaLabel, mono, pillButton, sans } from '@/lib/theme';
import { type InviteState, inviteAuditor } from './invite';

/**
 * S5.1 — put someone on the network.
 *
 * The link is shown once and never stored, so the copy says so plainly rather
 * than letting an admin assume they can come back for it. Re-inviting is
 * cheap; a half-onboarded person who lost their link and cannot say so is not.
 */
export function InviteAuditor() {
  const [state, invite, inviting] = useActionState<InviteState, FormData>(inviteAuditor, {});

  return (
    <section
      style={{
        border: hairline,
        borderRadius: radius.tile,
        padding: 20,
        background: color.paper,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div>
        <h2 style={{ fontFamily: sans, fontSize: 15, margin: 0 }}>Invite an auditor</h2>
        <p style={{ ...bodyText, margin: '4px 0 0' }}>
          They choose their own password, then tell us where they work and what they can run. You
          approve them afterwards — accepting an invitation does not put anyone on the roster.
        </p>
      </div>

      <form action={invite} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          type="email"
          name="email"
          required
          placeholder="their@email.example"
          aria-label="Email address"
          style={{
            fontFamily: sans,
            flex: 1,
            padding: '10px 12px',
            border: hairline,
            borderRadius: radius.tile,
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={inviting}
          style={{ ...pillButton, opacity: inviting ? 0.5 : 1 }}
        >
          {inviting ? 'Creating…' : 'Create invitation'}
        </button>
      </form>

      {state.error ? (
        <p role="alert" style={{ ...metaLabel, color: color.creativeText, margin: 0 }}>
          {state.error}
        </p>
      ) : null}

      {state.link ? (
        <div
          style={{
            border: hairline,
            borderRadius: radius.tile,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <p style={{ ...bodyText, margin: 0 }}>
            Send this to {state.email}. It is shown once and is not stored — if it is lost, invite
            them again.
          </p>
          <code style={{ fontFamily: mono, fontSize: 12, wordBreak: 'break-all' }}>
            {state.link}
          </code>
        </div>
      ) : null}
    </section>
  );
}
