'use client';

import {
  AUDIT_TYPE_LABELS,
  BOOKING_LEAD_DAYS,
  earliestWindowStart,
  MINIMUM_WINDOW_DAYS,
  SHIFT_PAYMENT_LABELS,
} from '@picksel/core';
import { color, fontSize, fontWeight, radius } from '@picksel/tokens';
import { useActionState, useState } from 'react';
import { hairline, metaLabel, mono, pillButton, sans } from '@/lib/theme';
import { type BookingState, bookAudit } from './actions';

type AuditTypeKey = keyof typeof AUDIT_TYPE_LABELS;
type PaymentKey = keyof typeof SHIFT_PAYMENT_LABELS;

/** A selectable tile. Selected is a 2px teal border — the design's only cue. */
function Tile({
  label,
  selected,
  onSelect,
  grow,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  grow?: number;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      style={{
        flex: grow ?? 1,
        border: selected ? `2px solid ${color.teal}` : hairline,
        background: color.paper,
        borderRadius: radius.tile,
        padding: selected ? 11 : 12,
        fontWeight: selected ? 700 : 600,
        fontSize: fontSize.sm,
        color: selected ? color.ink : color.bodyBrown,
        fontFamily: sans,
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ ...metaLabel, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  border: hairline,
  background: color.paper,
  borderRadius: radius.tile,
  padding: '11px 14px',
  fontSize: fontSize.sm,
  fontFamily: sans,
  color: color.ink,
} as const;

export function BookingForm({ credits }: { credits: number }) {
  const [state, action, pending] = useActionState<BookingState, FormData>(bookAudit, {});
  const [auditType, setAuditType] = useState<AuditTypeKey>('street');
  const earliest = earliestWindowStart(new Date());
  const [payment, setPayment] = useState<PaymentKey>('direct_debit');

  const noCredits = credits < 1;

  return (
    <form
      action={action}
      style={{
        flex: 1,
        padding: '26px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxWidth: 640,
      }}
    >
      <h1
        style={{
          fontWeight: fontWeight.extrabold,
          fontSize: fontSize.xl,
          letterSpacing: '-0.03em',
          margin: 0,
        }}
      >
        Book an audit
      </h1>

      <input type="hidden" name="auditType" value={auditType} />
      <input type="hidden" name="shiftPaymentMethod" value={payment} />

      <div>
        <div style={{ ...metaLabel, marginBottom: 8 }}>1 — Audit type</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {(Object.keys(AUDIT_TYPE_LABELS) as AuditTypeKey[]).map((key) => (
            <Tile
              key={key}
              label={AUDIT_TYPE_LABELS[key]}
              selected={auditType === key}
              onSelect={() => setAuditType(key)}
            />
          ))}
        </div>
      </div>

      <div>
        <div style={{ ...metaLabel, marginBottom: 8 }}>2 — Payment method on shift</div>
        <div style={{ display: 'flex', gap: 10, maxWidth: 420 }}>
          {(Object.keys(SHIFT_PAYMENT_LABELS) as PaymentKey[]).map((key) => (
            <Tile
              key={key}
              label={SHIFT_PAYMENT_LABELS[key]}
              selected={payment === key}
              onSelect={() => setPayment(key)}
            />
          ))}
        </div>
        <div style={{ fontSize: fontSize.xs, color: color.muted, marginTop: 6 }}>
          Sets the checklist variant the auditor uses.
        </div>
      </div>

      <div>
        <div style={{ ...metaLabel, marginBottom: 8 }}>3 — Video / audio evidence</div>
        <label
          style={{
            background: color.paper,
            border: hairline,
            borderRadius: radius.tile,
            padding: '14px 16px',
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          <input type="checkbox" name="requiresAv" style={{ width: 18, height: 18 }} />
          <span>
            <span style={{ display: 'block', fontWeight: fontWeight.bold, fontSize: fontSize.sm }}>
              Require A/V where lawful
            </span>
            <span
              style={{ display: 'block', fontSize: fontSize.xs, color: color.muted, marginTop: 2 }}
            >
              Only auditors with A/V capability are eligible — expect a smaller pool and possibly a
              later date.
            </span>
          </span>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        <Field label="4 — Postcode of activity">
          <input
            name="postcode"
            required
            placeholder="SE15 4QL"
            autoComplete="postal-code"
            style={{ ...inputStyle, fontFamily: mono }}
          />
        </Field>
        <div style={{ flex: 1.4 }}>
          <div style={{ ...metaLabel, marginBottom: 8 }}>5 — Date window</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="date" name="windowStartOn" required min={earliest} style={inputStyle} />
            <span style={{ color: color.muted }} aria-hidden>
              →
            </span>
            <input type="date" name="windowEndOn" required min={earliest} style={inputStyle} />
          </div>
          <div style={{ fontSize: fontSize.xs, color: color.muted, marginTop: 6 }}>
            At least {MINIMUM_WINDOW_DAYS} days, starting {BOOKING_LEAD_DAYS}+ days from today — so
            an auditor can be matched without revealing the shift date.
          </div>
        </div>
      </div>

      {state.error ? (
        <p
          role="alert"
          style={{
            margin: 0,
            fontSize: fontSize.sm,
            color: color.creativeText,
            border: `1px solid ${color.creativeText}`,
            borderRadius: radius.tile,
            padding: '10px 14px',
            background: color.paper,
          }}
        >
          {state.error}
        </p>
      ) : null}

      <div
        style={{
          marginTop: 'auto',
          borderTop: hairline,
          paddingTop: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <div style={{ fontSize: fontSize.sm, color: color.bodyBrown }}>
          {noCredits ? (
            'No credits available. Top up before booking.'
          ) : (
            <>
              1 credit will be used · balance after booking{' '}
              <b style={{ color: color.ink }}>{credits - 1}</b>
            </>
          )}
        </div>
        <button
          type="submit"
          disabled={pending || noCredits}
          style={{
            ...pillButton,
            marginLeft: 'auto',
            opacity: pending || noCredits ? 0.5 : 1,
            cursor: pending || noCredits ? 'not-allowed' : 'pointer',
          }}
        >
          {pending ? 'Booking…' : 'Confirm booking'}
        </button>
      </div>
    </form>
  );
}
