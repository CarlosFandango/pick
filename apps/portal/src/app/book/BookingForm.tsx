'use client';

import {
  AUDIT_TYPE_DESCRIPTIONS,
  AUDIT_TYPE_LABELS,
  BOOKING_LEAD_DAYS,
  earliestWindowStart,
  isEnabled,
  MINIMUM_WINDOW_DAYS,
  SHIFT_PAYMENT_DESCRIPTIONS,
  SHIFT_PAYMENT_LABELS,
} from '@picksel/core';
import { color, radius } from '@picksel/tokens';
import { useActionState, useState } from 'react';
import { InfoHint } from '@/components/InfoHint';
import { bodyText, clientColumn, hairline, metaLabel, mono, pageTitle, pillButton, sans } from '@/lib/theme';
import { type BookingState, bookAudit } from './actions';

type AuditTypeKey = keyof typeof AUDIT_TYPE_LABELS;
type PaymentKey = keyof typeof SHIFT_PAYMENT_LABELS;

/** A selectable tile. Selected is a 2px teal border — the design's only cue. */
function Tile({
  label,
  description,
  selected,
  onSelect,
  grow,
}: {
  label: string;
  description?: string;
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
        fontSize: 13,
        color: selected ? color.ink : color.bodyBrown,
        fontFamily: sans,
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      {label}
      {description ? (
        <span
          style={{
            display: 'block',
            marginTop: 3,
            fontSize: 11.5,
            fontWeight: 400,
            lineHeight: 1.4,
            color: color.muted,
          }}
        >
          {description}
        </span>
      ) : null}
    </button>
  );
}

/**
 * A numbered step, with its explanation one click away.
 *
 * This is where the product asks a charity to commit a credit, and every
 * question on it has a reason that is obvious to us and opaque to them. The
 * hint is offered rather than shouted, so the form stays a form.
 */
function Step({
  number,
  label,
  hint,
  children,
}: {
  number: number;
  label: string;
  hint: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <InfoHint
          label={
            <span style={metaLabel}>
              {number} — {label}
            </span>
          }
        >
          {hint}
        </InfoHint>
      </div>
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
  fontSize: 13,
  fontFamily: sans,
  color: color.ink,
} as const;

export interface PlaceOption {
  id: string;
  name: string;
  region: string | null;
}

export function BookingForm({ credits, places }: { credits: number; places: PlaceOption[] }) {
  const [state, action, pending] = useActionState<BookingState, FormData>(bookAudit, {});
  const [auditType, setAuditType] = useState<AuditTypeKey>('street');
  const earliest = earliestWindowStart(new Date());
  const [payment, setPayment] = useState<PaymentKey>('direct_debit');

  const noCredits = credits < 1;

  return (
    <form
      action={action}
      style={{
        // Centred, like every other client screen. This form declared a
        // measure and never centred it, so it rendered hard against the left
        // edge of a 1440px window — the same bug the design pass fixed on five
        // other pages (TND-101) and missed here.
        ...clientColumn,
        maxWidth: 680,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div>
        <h1 style={{ ...pageTitle, marginBottom: 8 }}>Book an audit</h1>
        <p style={{ ...bodyText, margin: 0, maxWidth: '58ch' }}>
          One credit. We will not tell your agency it is happening, and you choose a three-day
          window rather than a date so the shift cannot be staged for us.
        </p>
      </div>

      <input type="hidden" name="auditType" value={auditType} />
      <input type="hidden" name="shiftPaymentMethod" value={payment} />

      <Step
        number={1}
        label="Audit type"
        hint={
          <>
            The kind of fundraising you want observed. Each type is a different methodology with its
            own checklist and its own regulations, so the audit is only as useful as this answer is
            accurate. Pick the activity the team will actually be doing on the day.
          </>
        }
      >
        <div style={{ display: 'flex', gap: 10 }}>
          {(Object.keys(AUDIT_TYPE_LABELS) as AuditTypeKey[]).map((key) => (
            <Tile
              key={key}
              label={AUDIT_TYPE_LABELS[key]}
              description={AUDIT_TYPE_DESCRIPTIONS[key]}
              selected={auditType === key}
              onSelect={() => setAuditType(key)}
            />
          ))}
        </div>
      </Step>

      <Step
        number={2}
        label="Payment method on shift"
        hint={
          <>
            What your fundraisers will be asking the public to set up — a regular gift by Direct
            Debit, or a one-off card or contactless donation.
            <br />
            <br />
            It changes what the auditor checks. A Direct Debit sign-up carries obligations a one-off
            donation does not: the Direct Debit Guarantee, cancellation rights, and how an ongoing
            commitment is described. Tell us the wrong one and the audit measures the wrong rules.
          </>
        }
      >
        <div style={{ display: 'flex', gap: 10, maxWidth: 420 }}>
          {(Object.keys(SHIFT_PAYMENT_LABELS) as PaymentKey[]).map((key) => (
            <Tile
              key={key}
              label={SHIFT_PAYMENT_LABELS[key]}
              description={SHIFT_PAYMENT_DESCRIPTIONS[key]}
              selected={payment === key}
              onSelect={() => setPayment(key)}
            />
          ))}
        </div>
      </Step>

      {isEnabled('avEvidence') ? (
        <Step
          number={3}
          label="Video / audio evidence"
          hint={
            <>
              Asks for an auditor who can record the interaction, where recording is lawful at that
              site. Only auditors with A/V capability are then eligible, so expect a smaller pool
              and possibly a later date.
            </>
          }
        >
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
            <span style={{ fontWeight: 700, fontSize: 13.5 }}>Require A/V where lawful</span>
          </label>
        </Step>
      ) : null}

      <div style={{ display: 'flex', gap: 24 }}>
        <Step
          number={isEnabled('avEvidence') ? 4 : 3}
          label="Where the team is working"
          hint={
            <>
              The place decides which auditors can reach it. The address is for the auditor to
              navigate by, and can be written however you would write it.
            </>
          }
        >
          <select name="placeId" required defaultValue="" style={inputStyle}>
            <option value="" disabled>
              Choose a place
            </option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.region ? `${place.name} — ${place.region}` : place.name}
              </option>
            ))}
          </select>
          <input
            name="postcode"
            required
            placeholder="Rye Lane, outside the station"
            style={{ ...inputStyle, marginTop: 8 }}
          />
        </Step>
        <div style={{ flex: 1.4 }}>
          <Step
            number={isEnabled('avEvidence') ? 5 : 4}
            label="Date window"
            hint={
              <>
                A range of days the audit could fall on, not a fixed date. A team that knows exactly
                when it is being watched behaves differently that day, and you would be paying to
                observe the exception rather than the norm. Neither your fundraisers nor the auditor
                learns the date until it happens.
                <br />
                <br />
                At least {MINIMUM_WINDOW_DAYS} days long, starting {BOOKING_LEAD_DAYS} or more days
                from today so there is time to match an auditor.
              </>
            }
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="date" name="windowStartOn" required min={earliest} style={inputStyle} />
              <span style={{ color: color.muted }} aria-hidden>
                →
              </span>
              <input type="date" name="windowEndOn" required min={earliest} style={inputStyle} />
            </div>
          </Step>
        </div>
      </div>

      {state.error ? (
        <p
          role="alert"
          style={{
            margin: 0,
            fontSize: 13,
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
        <div style={{ fontSize: 13, color: color.bodyBrown }}>
          {noCredits ? (
            <>
              No credits available.{' '}
              <a href="/credits" style={{ color: color.link, fontWeight: 600 }}>
                How to order more
              </a>
            </>
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
