import { describe, expect, it } from 'vitest';
import {
  type OfferListItem,
  offerState,
  offerTotalMinorUnits,
  sortOffers,
  timeLeftLabel,
  upliftLabel,
} from '../src/offers';

const NOW = new Date('2026-03-01T10:00:00Z');

let seq = 0;
function offer(over: Partial<OfferListItem> = {}): OfferListItem {
  seq += 1;
  return {
    id: `o${seq}`,
    auditTypeLabel: 'Street',
    areaLabel: 'SE15 — Peckham',
    windowLabel: 'Tue 3 – Thu 5 Mar',
    paymentMethodLabel: 'direct debit',
    baseMinorUnits: 10000,
    travelMinorUnits: 1500,
    expiresAt: new Date('2026-03-03T08:00:00Z'),
    outcome: 'offered',
    ...over,
  };
}

describe('offerState', () => {
  it('is new while there is plenty of time', () => {
    expect(offerState(offer(), NOW)).toBe('new');
  });

  it('is expiring once it is close', () => {
    expect(offerState(offer({ expiresAt: new Date('2026-03-01T16:00:00Z') }), NOW)).toBe(
      'expiring',
    );
  });

  it('reads as filled when someone else took it', () => {
    // An auditor who saw a job yesterday should find out it went, not watch
    // it vanish — the network never looks silent.
    expect(offerState(offer({ outcome: 'withdrawn' }), NOW)).toBe('filled');
    expect(offerState(offer({ outcome: 'accepted' }), NOW)).toBe('filled');
  });

  it('is gone once it has expired or been declined', () => {
    expect(offerState(offer({ expiresAt: new Date('2026-03-01T09:00:00Z') }), NOW)).toBe('gone');
    expect(offerState(offer({ outcome: 'declined' }), NOW)).toBe('gone');
  });

  it('treats an offer with no expiry as open', () => {
    expect(offerState(offer({ expiresAt: null }), NOW)).toBe('new');
  });
});

describe('timeLeftLabel', () => {
  it.each([
    ['2026-03-01T16:00:00Z', '6H LEFT'],
    ['2026-03-01T10:30:00Z', '30M LEFT'],
    ['2026-03-01T09:00:00Z', 'EXPIRED'],
  ])('renders %s as %s', (at, expected) => {
    expect(timeLeftLabel(offer({ expiresAt: new Date(at) }), NOW)).toBe(expected);
  });
});

describe('pay on an offer', () => {
  it('totals base and travel', () => {
    expect(offerTotalMinorUnits(offer())).toBe(11500);
  });

  it('never hides the uplift inside the total', () => {
    expect(upliftLabel(offer())).toBe('incl. £15 travel uplift');
  });

  it('says nothing when there is no uplift', () => {
    expect(upliftLabel(offer({ travelMinorUnits: 0 }))).toBe('');
  });
});

describe('sortOffers', () => {
  it('puts the ones about to go first', () => {
    const soon = offer({ expiresAt: new Date('2026-03-01T14:00:00Z') });
    const later = offer({ expiresAt: new Date('2026-03-05T10:00:00Z') });
    const taken = offer({ outcome: 'withdrawn' });

    expect(sortOffers([taken, later, soon], NOW).map((o) => o.id)).toEqual([
      soon.id,
      later.id,
      taken.id,
    ]);
  });

  it('drops what is simply gone', () => {
    const declined = offer({ outcome: 'declined' });
    const live = offer();
    expect(sortOffers([declined, live], NOW).map((o) => o.id)).toEqual([live.id]);
  });
});
