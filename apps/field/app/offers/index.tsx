import type { OfferListItem } from '@picksel/core';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Loading } from '@/components/Loading';
import { OffersScreen } from '@/components/OffersScreen';
import { fetchOffers } from '@/lib/queries';
import { syncNow } from '@/lib/sync';
import { useLoad } from '@/lib/useLoad';

/** S2.1 — the offers list. What an auditor opens the app for. */
export default function Offers() {
  const router = useRouter();
  const { data, error, reload } = useLoad(fetchOffers);

  // Opening the offers list is the moment an auditor is most likely back in
  // signal, so it is where anything still queued from the last shift goes up.
  useEffect(() => {
    void syncNow();
  }, []);

  if (!data) return <Loading error={error} onRetry={reload} />;

  return (
    <OffersScreen
      offers={data}
      now={new Date()}
      whoAndArea="Your offers"
      onView={(offer: OfferListItem) => router.push(`/offers/${offer.id}`)}
    />
  );
}
