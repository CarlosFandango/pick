import {
  AUDIT_TYPE_LABELS,
  formatDay,
  formatDayLong,
  TRAVEL_MODE_LABELS,
  TRAVEL_MODE_THIRD_PERSON,
} from '@picksel/core';
import { color, radius } from '@picksel/tokens';
import type { ReactNode } from 'react';
import { bodyText, hairline, metaLabel } from '@/lib/theme';

/**
 * One auditor waiting to be vetted, opened out.
 *
 * Vetting is the gate the whole marketplace hangs on, and the roster row was
 * a name, a postcode and an Approve button — so whoever pressed it had to
 * remember from outside the system whether they had seen a passport.
 *
 * The checklist is a checklist because that is what vetting is. Items we have
 * no field for say so rather than showing an unticked box: an empty box reads
 * as "not done yet", and "we do not record this anywhere" is a different and
 * more useful thing to be told.
 */
export interface VettingSubject {
  auditorId: string;
  fullName: string | null;
  email: string | null;
  appliedAt: string | null;
  basePlace: string | null;
  basePostcode: string | null;
  maxTravelMinutes: number | null;
  travelMode: keyof typeof TRAVEL_MODE_LABELS | null;
  areas: string[];
  auditTypes: (keyof typeof AUDIT_TYPE_LABELS)[];
  avCapable: boolean;
  rightToWorkCheckedOn: string | null;
  dbsCheckedOn: string | null;
  /** Places this person would be the only approved cover for. */
  soleCoverFor: string[];
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ minWidth: 140 }}>
      <div style={{ ...metaLabel, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{value}</div>
    </div>
  );
}

function Check({
  done,
  label,
  detail,
  untracked,
}: {
  done: boolean;
  label: string;
  detail: string;
  untracked?: boolean;
}) {
  const fill = untracked ? color.oat : done ? color.teal : 'transparent';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '7px 0' }}>
      <span
        aria-hidden
        style={{
          flex: 'none',
          width: 18,
          height: 18,
          borderRadius: radius.pill,
          background: fill,
          border: done && !untracked ? 'none' : `1px solid ${color.oat}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {done && !untracked ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color.bone} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            <title>{''}</title>
            <path d="m5 13 4 4L19 7" />
          </svg>
        ) : null}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, flex: 'none', width: 168 }}>
        {label}
        <span style={{ position: 'absolute', left: -9999 }}>
          {untracked ? ' — not recorded' : done ? ' — done' : ' — outstanding'}
        </span>
      </span>
      <span style={{ ...bodyText, fontSize: 12.5, color: untracked ? color.auditingText : color.muted }}>
        {detail}
      </span>
    </div>
  );
}

export function VettingCard({
  subject,
  actions,
}: {
  subject: VettingSubject;
  actions?: ReactNode;
}) {
  const travel =
    subject.maxTravelMinutes && subject.travelMode
      ? `${subject.maxTravelMinutes} min · ${TRAVEL_MODE_THIRD_PERSON[subject.travelMode]}`
      : 'Not given';

  return (
    <div
      style={{
        background: color.paper,
        border: hairline,
        borderTop: `5px solid ${color.auditing}`,
        borderRadius: radius.tile,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
          {subject.fullName || subject.email}
        </h2>
        <span style={metaLabel}>
          {subject.appliedAt ? `Applied ${formatDayLong(new Date(subject.appliedAt))}` : 'Applied —'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        <Fact label="Sets out from" value={subject.basePlace ?? subject.basePostcode ?? '—'} />
        <Fact label="Will travel" value={travel} />
        <Fact
          label="Covers"
          value={subject.areas.length ? subject.areas.join(', ') : 'Nowhere yet'}
        />
        <Fact
          label="Says they can run"
          value={
            subject.auditTypes.length
              ? subject.auditTypes.map((t) => AUDIT_TYPE_LABELS[t]).join(', ')
              : 'Nothing yet'
          }
        />
        {subject.avCapable ? <Fact label="A/V" value="Can capture" /> : null}
      </div>

      <div>
        <div style={{ ...metaLabel, marginBottom: 4 }}>Before approving</div>
        <Check
          done={Boolean(subject.rightToWorkCheckedOn)}
          label="Right to work"
          detail={
            subject.rightToWorkCheckedOn
              ? `Checked ${formatDay(new Date(subject.rightToWorkCheckedOn))}`
              : 'Not checked'
          }
        />
        <Check
          done={Boolean(subject.dbsCheckedOn)}
          label="DBS"
          detail={
            subject.dbsCheckedOn
              ? `Checked ${formatDay(new Date(subject.dbsCheckedOn))}`
              : 'Not checked'
          }
        />
        <Check
          done={false}
          untracked
          label="Auditor agreement"
          detail="Not recorded anywhere — approving does not check it (TND-58)"
        />
      </div>

      {subject.soleCoverFor.length > 0 ? (
        <p
          style={{
            ...bodyText,
            margin: 0,
            fontSize: 12.5,
            borderTop: hairline,
            paddingTop: 12,
          }}
        >
          They would be the only approved auditor covering{' '}
          <strong style={{ color: color.ink }}>{subject.soleCoverFor.join(', ')}</strong>.
        </p>
      ) : null}

      {actions ? <div style={{ display: 'flex', gap: 12 }}>{actions}</div> : null}
    </div>
  );
}
