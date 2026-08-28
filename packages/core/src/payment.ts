/**
 * Where an auditor's money has got to (TND-95, part 3).
 *
 * The question auditors ask most, and the one the app could not answer: the
 * earnings screen collapsed everything into "paid" or "pending", so an audit
 * cleared for payment three weeks ago looked exactly like one submitted this
 * morning.
 *
 * ## What this deliberately cannot see
 *
 * Payment and client release resolve independently (TND-81). An audit can be
 * cleared for payment while the client's copy is still held, and the auditor
 * must learn the first without learning anything about the second — a single
 * blended "status" would leak review activity that is none of their business,
 * and would also be wrong, because the two do not move together.
 *
 * So the input here is only ever the auditor's own audit status and their own
 * payout line. The gate state is never consulted. There is nothing to leak
 * because nothing about the client's copy is in scope.
 */

/** The states an auditor's payment can be in, in the order they happen. */
export const PAYMENT_STATES = ['in_review', 'cleared', 'scheduled', 'paid', 'attention'] as const;

export type PaymentState = (typeof PAYMENT_STATES)[number];

export interface PaymentView {
  state: PaymentState;
  /** What the auditor reads. Says what is happening, never why it is held. */
  label: string;
  /** Present once the money has actually moved. */
  reference: string | null;
}

/**
 * The line as the auditor's own row exposes it. `null` when no payout line
 * exists yet — which is most of an audit's life, and is not an error.
 */
export interface PayoutLineView {
  status: string;
  external_reference: string | null;
}

const LABELS: Record<PaymentState, string> = {
  in_review: 'With PICK for review',
  cleared: 'Cleared for payment',
  scheduled: 'In the next payout run',
  paid: 'Paid',
  attention: 'PICK is looking into this',
};

/**
 * A terminal audit is one the auditor has finished with. `no_team_present` is
 * terminal and paid in full — the auditor travelled and waited — so it must
 * never read as an incomplete job.
 */
const FINISHED = ['released', 'no_team_present'];

export function paymentState(
  auditStatus: string,
  line: PayoutLineView | null | undefined,
): PaymentView {
  const reference = line?.external_reference ?? null;

  if (line) {
    switch (line.status) {
      case 'paid':
        return { state: 'paid', label: LABELS.paid, reference };
      case 'pending':
        return { state: 'scheduled', label: LABELS.scheduled, reference: null };
      // `held` and `failed` are both "a human has to do something", and the
      // auditor cannot tell them apart or act on the difference. One label,
      // rather than two that invite a wrong guess about whose fault it is.
      default:
        return { state: 'attention', label: LABELS.attention, reference: null };
    }
  }

  if (FINISHED.includes(auditStatus)) {
    return { state: 'cleared', label: LABELS.cleared, reference: null };
  }

  return { state: 'in_review', label: LABELS.in_review, reference: null };
}

/**
 * Whether this audit is far enough along to have a payment state worth showing.
 *
 * An audit still to be worked has no answer to "where is my money", and
 * showing "with PICK for review" against a shift next Tuesday would be a lie.
 */
export function awaitingPayment(auditStatus: string): boolean {
  return auditStatus === 'in_review' || FINISHED.includes(auditStatus);
}
