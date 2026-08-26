import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Loading } from '@/components/Loading';
import { OfferScreen } from '@/components/OfferScreen';
import { acceptOffer, declineOffer, fetchOffer } from '@/lib/queries';
import { useLoad } from '@/lib/useLoad';

/** S1.3 — one offer, with the pay shown in full before accepting. */
export default function OfferDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { data, error, reload } = useLoad(() => fetchOffer(id));

  if (!data) return <Loading error={error} onRetry={reload} />;

  /**
   * The database is the authority on whether an offer can still be taken —
   * two auditors accepting at the same instant is a lock, not a check here.
   * So this just runs it and lets the failure surface.
   */
  async function respond(action: () => Promise<void>, next: string) {
    setBusy(true);
    try {
      await action();
      router.replace(next as never);
    } finally {
      setBusy(false);
    }
  }

  return (
    <OfferScreen
      offer={data}
      busy={busy}
      onAccept={() => respond(() => acceptOffer(id), '/audits')}
      onDecline={() => respond(() => declineOffer(id), '/offers')}
    />
  );
}
