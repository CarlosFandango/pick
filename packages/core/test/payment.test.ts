import { describe, expect, it } from 'vitest';
import { awaitingPayment, paymentState } from '../src/payment';

/**
 * TND-95 part 3 — what an auditor is told about their money.
 *
 * The rule these pin is the independence one: nothing an auditor sees about
 * payment may depend on, or reveal, what is happening with the client's copy.
 */

describe('where an auditor’s money has got to', () => {
  it('says the audit is with PICK once it has been submitted', () => {
    expect(paymentState('in_review', null).state).toBe('in_review');
  });

  it('says cleared once PICK has finished with it and before a run is built', () => {
    expect(paymentState('released', null).state).toBe('cleared');
  });

  it('treats a no-show as finished work, because it is paid in full', () => {
    // The auditor travelled and waited. Reading as "still in review" would
    // suggest they had done something wrong.
    expect(paymentState('no_team_present', null).state).toBe('cleared');
  });

  it('says scheduled once it is on a run, and does not promise a reference yet', () => {
    const view = paymentState('released', { status: 'pending', external_reference: null });
    expect(view.state).toBe('scheduled');
    expect(view.reference).toBeNull();
  });

  it('gives the reference only once the money has actually moved', () => {
    const view = paymentState('released', { status: 'paid', external_reference: 'BACS-0091' });
    expect(view.state).toBe('paid');
    expect(view.reference).toBe('BACS-0091');
  });

  it('never shows a stale reference on a line that has not paid out', () => {
    // A run can carry a reference before every line settles. Showing it beside
    // "in the next payout run" would read as "you have been paid".
    const view = paymentState('released', { status: 'pending', external_reference: 'BACS-0091' });
    expect(view.reference).toBeNull();
  });

  it('collapses held and failed into one thing a human is dealing with', () => {
    // An auditor can act on neither and cannot tell them apart. Two labels
    // would only invite a wrong guess about whose fault it is.
    expect(paymentState('released', { status: 'held', external_reference: null }).state).toBe(
      'attention',
    );
    expect(paymentState('released', { status: 'failed', external_reference: null }).state).toBe(
      'attention',
    );
  });

  it('says nothing about the client’s copy, whatever the audit status', () => {
    // The independence rule, as a test: payment state is a function of the
    // auditor's own audit status and their own payout line. There is no gate
    // input to leak, and this fails if one is ever added.
    expect(paymentState.length).toBe(2);

    // An audit still held from the client is `in_review`, and reads exactly
    // like any other audit with PICK — no hint that a hold exists.
    expect(paymentState('in_review', null).label).toBe(paymentState('in_review', undefined).label);
  });
});

describe('which audits have a payment state at all', () => {
  it('has nothing to say about work that has not happened yet', () => {
    for (const status of ['booked', 'assigned', 'in_progress']) {
      expect(awaitingPayment(status)).toBe(false);
    }
  });

  it('answers for everything from submission onwards', () => {
    for (const status of ['in_review', 'released', 'no_team_present']) {
      expect(awaitingPayment(status)).toBe(true);
    }
  });

  it('has nothing to say about a cancelled audit', () => {
    expect(awaitingPayment('cancelled')).toBe(false);
  });
});
