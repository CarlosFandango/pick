import type { AuditStatus } from '@picksel/core';
import { useRouter } from 'expo-router';
import { Loading } from '@/components/Loading';
import { MyAuditsScreen } from '@/components/MyAuditsScreen';
import { fetchMyAudits } from '@/lib/queries';
import { useLoad } from '@/lib/useLoad';

/**
 * Where an audit takes you depends on where it has got to.
 *
 * Before the shift there is prep; during it, the session; afterwards, the
 * write-up. An auditor should not have to work out which screen they want —
 * they tap the job and get the thing that is due.
 */
function routeFor(status: AuditStatus, id: string): string | null {
  switch (status) {
    case 'assigned':
      return `/audit/${id}/prep`;
    case 'in_progress':
      return `/audit/${id}/write-up`;
    default:
      // Released, in review, no-show, cancelled: nothing left to do, and
      // opening a read-only screen would imply there was.
      return null;
  }
}

/** S2.5 — the audits this auditor has taken. */
export default function MyAudits() {
  const router = useRouter();
  const { data, error, reload } = useLoad(fetchMyAudits);

  if (!data) return <Loading error={error} onRetry={reload} />;

  return (
    <MyAuditsScreen
      audits={data}
      onOpen={(audit) => {
        const route = routeFor(audit.status, audit.id);
        if (route) router.push(route as never);
      }}
    />
  );
}
