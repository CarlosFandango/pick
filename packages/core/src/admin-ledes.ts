import type { Lede } from './lede';
import { type CurrencyCode, formatMoney } from './money';

/**
 * The opening sentence on each of PICK's own screens.
 *
 * These live in core rather than in the pages for the same reason the client's
 * do: two screens describing the same state in different words is how a small
 * team stops trusting either. They are also the only part of an ops screen
 * that is worth a test — the tables underneath are a rendering of rows.
 */

/**
 * Whether an audit's fee can go out in the next run.
 *
 * `payable_audits` returns everything owed and names whatever is still holding
 * each one back, so "ready" is a predicate over that column rather than a
 * separate query. It lives here because the payouts screen was deciding it
 * twice — once for the list and once for the sentence above it — and the two
 * disagreed on screen the first time they were asked the same question.
 */
export function isPayableNow(gate: string | null): boolean {
  return gate !== 'hold';
}

/**
 * Money out.
 *
 * The number that leads is what can go out TODAY, not what is owed in total.
 * An amount that includes audits still with review is a number nobody can
 * act on, and acting is the whole purpose of this screen.
 */
export function payoutsLede(input: {
  readyCount: number;
  readyMinorUnits: number;
  auditorCount: number;
  heldCount: number;
  currency: CurrencyCode;
}): Lede {
  const { readyCount, readyMinorUnits, auditorCount, heldCount, currency } = input;

  if (readyCount === 0) {
    return {
      tone: heldCount > 0 ? 'waiting' : 'clear',
      meta: 'Nothing to pay',
      headline: 'No audits are cleared for payment.',
      detail:
        heldCount > 0
          ? `${heldCount} ${heldCount === 1 ? 'is' : 'are'} still with review and will join the next run once released.`
          : 'Everything that has cleared has been paid.',
    };
  }

  return {
    tone: 'clear',
    meta: `${formatMoney(readyMinorUnits, currency)} ready`,
    headline: `${readyCount === 1 ? 'One audit is' : `${readyCount} audits are`} cleared for payment, across ${
      auditorCount === 1 ? 'one auditor' : `${auditorCount} auditors`
    }.`,
    detail:
      heldCount > 0
        ? `${heldCount === 1 ? 'One further audit is' : `${heldCount} further audits are`} with review and will join the next run once released.`
        : 'Nothing is held.',
  };
}

/**
 * The risk register.
 *
 * The register is not bookkeeping: its value is that we identified a risk AND
 * put it to the charity in writing. So the sentence answers "did we warn
 * them", and the failure state — a risk nobody has advised on — leads.
 */
export function risksLede(input: { open: number; advised: number; unadvised: number }): Lede {
  const { open, advised, unadvised } = input;

  if (open === 0 && advised === 0) {
    return {
      tone: 'clear',
      meta: 'Nothing on the register',
      headline: 'No risks have been raised.',
      detail: '',
    };
  }

  if (unadvised > 0) {
    return {
      tone: 'breach',
      meta: `${unadvised} not put to the charity`,
      headline:
        unadvised === 1
          ? 'One risk has not been put to the charity in writing.'
          : `${unadvised} risks have not been put to the charity in writing.`,
      detail:
        'Until it is on the record, the same facts read as PICK quietly supplying a degraded audit.',
    };
  }

  return {
    tone: 'clear',
    meta: `${open} open · ${advised} advised · 0 unanswered`,
    headline: 'Everything we have spotted has been put to the charity in writing.',
    detail:
      'If a finding is ever disputed, the defensible position is that we flagged the risk, we advised, and they chose to proceed — and none of that is worth anything unless the advice is on the record.',
  };
}

/**
 * Charities and credits.
 *
 * A marketplace operator's question here is who to talk to, not who exists.
 * Running out of credits is the one thing on this screen that is time-bound,
 * so it leads when it is true.
 */
export function clientsLede(input: {
  total: number;
  runningLow: { name: string; balance: number }[];
  openConcerns: number;
}): Lede {
  const { total, runningLow, openConcerns } = input;

  if (runningLow.length > 0) {
    const first = runningLow[0];
    return {
      tone: 'attention',
      meta: runningLow.length === 1 ? '1 running low' : `${runningLow.length} running low`,
      headline:
        runningLow.length === 1
          ? 'One charity will run out of credits after their next booking.'
          : `${runningLow.length} charities are close to running out of credits.`,
      detail: first ? `${first.name} has ${first.balance === 1 ? 'one' : first.balance} left.` : '',
    };
  }

  if (openConcerns > 0) {
    return {
      tone: 'attention',
      meta: openConcerns === 1 ? '1 open concern' : `${openConcerns} open concerns`,
      headline:
        openConcerns === 1
          ? 'One charity is waiting to hear back about a concern.'
          : `${openConcerns} charities are waiting to hear back about a concern.`,
      detail: 'Everyone has credits to book with.',
    };
  }

  return {
    tone: 'clear',
    meta: `${total} ${total === 1 ? 'charity' : 'charities'}`,
    headline: 'Nobody is short of credits or waiting on us.',
    detail: '',
  };
}
