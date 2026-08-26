import { EarningsScreen } from '@/components/EarningsScreen';
import { Loading } from '@/components/Loading';
import { fetchEarnings } from '@/lib/queries';
import { useLoad } from '@/lib/useLoad';

/** S2.6 — what has been earned and what has been paid. */
export default function Earnings() {
  const { data, error, reload } = useLoad(fetchEarnings);
  if (!data) return <Loading error={error} onRetry={reload} />;
  // No payout run is scheduled yet — the builder is a later slice.
  return <EarningsScreen lines={data} nextRun={null} />;
}
