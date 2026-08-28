import {
  addMarker,
  addTally,
  advanceStage,
  currentStage,
  endStagedSession,
  type FlagSeverity,
  newId,
  type StagedSession,
  startStagedSession,
} from '@picksel/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FieldSessionScreen, FlagSheet } from '@/components/FieldSessionScreen';
import { Loading } from '@/components/Loading';
import { openDatabase } from '@/db/client';
import { recordMarker, recordSessionEnd, recordStageEntry, recordTally } from '@/lib/events';
import { type AuditType, fetchStages } from '@/lib/queries';
import { useAuditorId } from '@/lib/session';
import { syncNow } from '@/lib/sync';
import { useLoad } from '@/lib/useLoad';

/**
 * S1.5b — running the shift.
 *
 * Every tap writes locally first and syncs later. An auditor works a full
 * shift with no signal and the rows wait with `synced_at is null`, which IS
 * the queue — so nothing here awaits the network before updating the screen.
 */
export default function Session() {
  const { id, type } = useLocalSearchParams<{ id: string; type: AuditType }>();
  const router = useRouter();
  const auditorId = useAuditorId();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [session, setSession] = useState<StagedSession | null>(null);

  const { data: stages, error, reload } = useLoad(() => fetchStages(type));

  if (!stages)
    return <Loading error={error} onRetry={reload} onHome={() => router.replace('/home')} />;

  const live = session ?? startStagedSession(stages, new Date());
  const stage = currentStage(stages, live);

  /** Local write, then screen. The order matters if the app dies mid-tap. */
  async function write(
    record: (context: {
      db: Awaited<ReturnType<typeof openDatabase>>;
      auditId: string;
      auditorId: string;
    }) => Promise<unknown>,
  ) {
    const db = await openDatabase();
    await record({ db, auditId: id, auditorId });
  }

  return (
    <>
      <FieldSessionScreen
        stages={stages}
        session={live}
        now={new Date()}
        areaLabel="This shift"
        onAdvance={() => {
          const at = new Date();
          const next = advanceStage(stages, live, at);
          const entered = next.entries.at(-1);
          if (entered) void write((c) => recordStageEntry(c, entered.stageKey, at));
          setSession(next);
        }}
        onTally={(counterKey) => {
          if (!stage) return;
          const at = new Date();
          setSession(addTally(stages, live, { stageKey: stage.key, counterKey, occurredAt: at }));
          void write((c) => recordTally(c, stage.key, counterKey, at));
        }}
        onFlag={() => setSheetOpen(true)}
        onEnd={() => {
          const at = new Date();
          setSession(endStagedSession(live, at));
          if (stage) void write((c) => recordSessionEnd(c, stage.key, at));
          void syncNow();
          router.replace(`/audit/${id}/write-up` as never);
        }}
      />

      {sheetOpen ? (
        <FlagSheet
          onCancel={() => setSheetOpen(false)}
          onChoose={(severity: FlagSeverity) => {
            setSheetOpen(false);
            if (!stage) return;
            const at = new Date();
            setSession(
              addMarker(live, { id: newId(), stageKey: stage.key, severity, occurredAt: at }),
            );
            void write((c) => recordMarker(c, stage.key, severity, at));
          }}
        />
      ) : null}
    </>
  );
}
