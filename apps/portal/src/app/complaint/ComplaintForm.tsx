'use client';

import { COMPLAINT_ROUTES, type ComplaintSubject, routeFor } from '@picksel/core';
import { color, radius } from '@picksel/tokens';
import { useActionState, useState } from 'react';
import { hairline, metaLabel, pillButton, sans } from '@/lib/theme';
import { type ComplaintState, raiseComplaint } from './actions';

export function ComplaintForm({
  audits,
}: {
  audits: { id: string; reference: string; postcode: string }[];
}) {
  const [state, action, pending] = useActionState<ComplaintState, FormData>(raiseComplaint, {});
  const [subject, setSubject] = useState<ComplaintSubject>('about_audit');
  const route = routeFor(subject);

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <input type="hidden" name="subject" value={subject} />

      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={{ ...metaLabel, marginBottom: 8 }}>What is this about?</legend>
        <div style={{ display: 'flex', gap: 10 }}>
          {COMPLAINT_ROUTES.map((option) => (
            <button
              key={option.subject}
              type="button"
              aria-pressed={subject === option.subject}
              onClick={() => setSubject(option.subject)}
              style={{
                flex: 1,
                border: subject === option.subject ? `2px solid ${color.teal}` : hairline,
                background: color.paper,
                borderRadius: radius.tile,
                padding: subject === option.subject ? 11 : 12,
                fontWeight: subject === option.subject ? 700 : 600,
                fontSize: 13,
                fontFamily: sans,
                textAlign: 'left',
                cursor: 'pointer',
                color: color.ink,
              }}
            >
              {option.title}
            </button>
          ))}
        </div>
      </fieldset>

      {route.requiresAudit ? (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={metaLabel}>Which audit?</span>
          <select name="auditId" required style={inputStyle}>
            <option value="">Choose an audit</option>
            {audits.map((audit) => (
              <option key={audit.id} value={audit.id}>
                {audit.reference} · {audit.postcode}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={metaLabel}>What happened?</span>
        <textarea name="body" required rows={6} style={{ ...inputStyle, minHeight: 120 }} />
      </label>

      {state.error ? (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: color.creativeText }}>
          {state.error}
        </p>
      ) : null}
      {state.raised ? (
        <p style={{ margin: 0, fontSize: 13, color: color.teal }}>Raised. {route.outcome}</p>
      ) : null}

      <button type="submit" disabled={pending} style={{ ...pillButton, alignSelf: 'flex-start' }}>
        {pending ? 'Sending…' : 'Raise it'}
      </button>
    </form>
  );
}

const inputStyle = {
  border: hairline,
  background: color.paper,
  borderRadius: radius.tile,
  padding: '11px 14px',
  fontSize: 13,
  fontFamily: sans,
  color: color.ink,
} as const;
