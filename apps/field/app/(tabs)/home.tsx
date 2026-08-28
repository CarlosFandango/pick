import { useRouter } from 'expo-router';
import { HomeScreen } from '@/components/HomeScreen';
import { Loading } from '@/components/Loading';
import { fetchHome } from '@/lib/queries';
import { routeForAudit } from '@/lib/routes';
import { useLoad } from '@/lib/useLoad';

/**
 * S5.3 — where an auditor lands (TND-95).
 *
 * Home is their own work. Offers is still a tab, for the auditor who has
 * nothing on and is looking for some.
 */
export default function Home() {
  const router = useRouter();
  const { data, error, reload } = useLoad(() => fetchHome());

  if (!data) return <Loading error={error} onRetry={reload} />;

  return (
    <HomeScreen
      next={data.next}
      upcoming={data.upcoming}
      payments={data.payments}
      onOpen={(audit) => {
        const route = routeForAudit(audit.status, audit.id);
        if (route) router.push(route as never);
      }}
    />
  );
}
