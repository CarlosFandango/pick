import { formatMoney } from './money';

export type OfferState = 'new' | 'expiring' | 'filled' | 'gone';

/** Under this much time left, an offer is shown as expiring. */
export const EXPIRING_WITHIN_HOURS = 12;

export interface OfferListItem {
  id: string;
  auditTypeLabel: string;
  areaLabel: string;
  windowLabel: string;
  paymentMethodLabel: string;
  basePence: number;
  travelPence: number;
  expiresAt: Date | null;
  outcome: 'offered' | 'accepted' | 'declined' | 'expired' | 'withdrawn';
}

/**
 * What state to show an offer in.
 *
 * `withdrawn` reads as "filled" rather than disappearing: an auditor who saw a
 * job yesterday should find out it went, not watch it vanish. The network
 * never looks silent.
 */
export function offerState(offer: OfferListItem, now: Date): OfferState {
  if (offer.outcome === 'withdrawn' || offer.outcome === 'accepted') return 'filled';
  if (offer.outcome === 'declined') return 'gone';
  if (offer.outcome === 'expired') return 'gone';
  if (!offer.expiresAt) return 'new';

  const hoursLeft = (offer.expiresAt.getTime() - now.getTime()) / 3_600_000;
  if (hoursLeft <= 0) return 'gone';
  return hoursLeft <= EXPIRING_WITHIN_HOURS ? 'expiring' : 'new';
}

/** "6H LEFT" once it is close; the full countdown before that. */
export function timeLeftLabel(offer: OfferListItem, now: Date): string {
  if (!offer.expiresAt) return '';
  const ms = offer.expiresAt.getTime() - now.getTime();
  if (ms <= 0) return 'EXPIRED';

  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}H LEFT`;
  return `${Math.max(1, Math.floor(ms / 60_000))}M LEFT`;
}

export function offerTotalPence(offer: OfferListItem): number {
  return offer.basePence + offer.travelPence;
}

/** "incl. £15 travel uplift" — the uplift is never hidden inside a total. */
export function upliftLabel(offer: OfferListItem): string {
  return offer.travelPence > 0 ? `incl. ${formatMoney(offer.travelPence)} travel uplift` : '';
}

/** Live offers first, then the ones that filled. Nothing that is simply gone. */
export function sortOffers(offers: readonly OfferListItem[], now: Date): OfferListItem[] {
  const rank: Record<OfferState, number> = { expiring: 0, new: 1, filled: 2, gone: 3 };
  return offers
    .filter((offer) => offerState(offer, now) !== 'gone')
    .sort((a, b) => rank[offerState(a, now)] - rank[offerState(b, now)]);
}
