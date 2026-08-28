import { startStagedSession } from '@picksel/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Loading } from '@/components/Loading';
import { NoShowScreen } from '@/components/NoShowScreen';
import { type AuditType, fetchStages, reportNoTeamPresent } from '@/lib/queries';
import { syncNow } from '@/lib/sync';
import { useLoad } from '@/lib/useLoad';

/**
 * S2.7 — nobody turned up.
 *
 * Deliberately undramatic. The auditor did their job by travelling and
 * waiting: they are paid in full and the client's credit is returned, both
 * handled by `report_no_team_present`. This screen should not feel like
 * reporting a failure, because it is not one.
 *
 * The 45-minute wait is enforced by the screen, which will not enable the
 * report until it has elapsed — an auditor who leaves after ten minutes has
 * not established that nobody was coming.
 */
export default function NoShow() {
  const { id, type, since } = useLocalSearchParams<{
    id: string;
    type: AuditType;
    since?: string;
  }>();
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const { data: stages, error, reload } = useLoad(() => fetchStages(type));

  if (!stages)
    return <Loading error={error} onRetry={reload} onHome={() => router.replace('/home')} />;

  // The clock runs from when the auditor arrived, which the session carries.
  const startedAt = since ? new Date(Number(since)) : new Date();
  const session = startStagedSession(stages, startedAt);

  return (
    <NoShowScreen
      session={session}
      now={new Date()}
      areaLabel="This shift"
      submitted={submitted}
      onKeepWaiting={() => router.back()}
      onReport={async () => {
        await reportNoTeamPresent(id, 'No team present');
        void syncNow();
        setSubmitted(true);
      }}
    />
  );
}
