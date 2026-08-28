import { useRouter } from 'expo-router';
import { Loading } from '@/components/Loading';
import { MyAuditsScreen } from '@/components/MyAuditsScreen';
import { fetchMyAudits } from '@/lib/queries';
import { routeForAudit } from '@/lib/routes';
import { useLoad } from '@/lib/useLoad';

/** S2.5 — the audits this auditor has taken. */
export default function MyAudits() {
  const router = useRouter();
  const { data, error, reload } = useLoad(fetchMyAudits);

  if (!data) return <Loading error={error} onRetry={reload} />;

  return (
    <MyAuditsScreen
      audits={data}
      onOpen={(audit) => {
        const route = routeForAudit(audit.status, audit.id);
        if (route) router.push(route as never);
      }}
    />
  );
}
