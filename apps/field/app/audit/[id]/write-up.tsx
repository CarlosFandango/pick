import { type Answer, buildWriteUp, type Verdict, type WriteUpCheck } from '@picksel/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Loading } from '@/components/Loading';
import { WriteUpScreen } from '@/components/WriteUpScreen';
import { fetchWriteUp, submitWriteUp } from '@/lib/queries';
import { syncNow } from '@/lib/sync';
import { useLoad } from '@/lib/useLoad';

/**
 * S1.6 — the write-up. The step that lets an audit leave the device.
 *
 * Answers are held here and submitted in one go, rather than written per tap.
 * `check_result` is append-only and `submit_write_up` refuses a partial
 * submission — it counts distinct checks against the pinned catalogue — so
 * dribbling rows up as they are answered would create a half-submitted audit
 * that can never be completed.
 *
 * The screen is fully controlled and fires `onNote` per keystroke, so the
 * state lives here.
 *
 * On stages (TND-83): this groups by moment, and stages 3-9 map 1:1 onto the
 * moments. What is missing is a summary of the observation stage — the
 * tallies from the 45 minutes before the mystery shop. That is an addition
 * once Jaz confirms the sequence, not a rebuild of this screen.
 */
export default function WriteUp() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, error, reload } = useLoad(() => fetchWriteUp(id));

  const [edits, setEdits] = useState<Map<string, Answer>>(new Map());
  const [openMoment, setOpenMoment] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);

  if (!data)
    return <Loading error={error} onRetry={reload} onHome={() => router.replace('/home')} />;

  const answers = new Map([...data.answers, ...edits]);

  const answer = (check: WriteUpCheck, next: Answer) => {
    const updated = new Map(edits);
    updated.set(check.id, { ...answers.get(check.id), ...next });
    setEdits(updated);
    setSavedAt(new Date());
  };

  const writeUp = buildWriteUp({
    checks: data.checks,
    answers,
    unlockedMoments: data.unlockedMoments.size > 0 ? data.unlockedMoments : undefined,
  });

  return (
    <WriteUpScreen
      writeUp={writeUp}
      title={data.title}
      savedAt={savedAt}
      openMoment={openMoment}
      onOpenMoment={(moment) => setOpenMoment(moment === openMoment ? null : moment)}
      onAnswer={(check, verdict: Verdict) => answer(check, { verdict })}
      onNote={(check, note) =>
        answer(check, { verdict: answers.get(check.id)?.verdict ?? 'note', note })
      }
      onSubmit={async () => {
        if (busy) return;
        setBusy(true);
        try {
          await submitWriteUp(id, answers);
          // Push anything the session queued while there was no signal. The
          // audit is already in review either way — sync failing must not
          // leave the auditor thinking their submission did not land.
          void syncNow();
          router.replace('/audits' as never);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
