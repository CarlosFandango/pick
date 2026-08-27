'use client';

import { color, fontSize } from '@picksel/tokens';
import { useActionState } from 'react';
import { pillButton } from '@/lib/theme';
import { type OfferState, offerToEligible } from './actions';

/** Offers the audit to everyone eligible. First to accept takes it. */
export function OfferButton({ auditId }: { auditId: string }) {
  const [state, action, pending] = useActionState<OfferState, FormData>(offerToEligible, {});

  return (
    <form action={action} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <input type="hidden" name="auditId" value={auditId} />
      <button type="submit" disabled={pending} style={pillButton}>
        {pending ? 'Offering…' : 'Offer to everyone eligible'}
      </button>
      {state.error ? (
        <span role="alert" style={{ fontSize: fontSize.sm, color: color.creativeText }}>
          {state.error}
        </span>
      ) : null}
      {typeof state.offered === 'number' ? (
        <span style={{ fontSize: fontSize.sm, color: color.teal }}>
          Offered to {state.offered} auditor{state.offered === 1 ? '' : 's'}.
        </span>
      ) : null}
    </form>
  );
}
