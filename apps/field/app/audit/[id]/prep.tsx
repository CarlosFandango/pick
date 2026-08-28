import { buildPrepPlan, type PrepCard } from '@picksel/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Loading } from '@/components/Loading';
import { PrepScreen } from '@/components/PrepScreen';
import { fetchPrep, forgetCard, markCardLearnt } from '@/lib/queries';
import { useLoad } from '@/lib/useLoad';

/**
 * S1.4 — prep, before the shift.
 *
 * "Got it" and "Again" are a plain upsert and a plain delete against
 * `prep_progress`. There is deliberately no scheduling and no algorithm: an
 * auditor decides what they still need to look at, and the app remembers.
 *
 * Progress is applied locally the moment it is tapped and written afterwards.
 * An auditor preps on the way to a pitch, often underground, and a card that
 * will not turn over until the network answers is a card that does not work.
 */
export default function Prep() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, error, reload } = useLoad(() => fetchPrep(id));
  const [learnt, setLearnt] = useState<Set<string> | null>(null);

  if (!data)
    return <Loading error={error} onRetry={reload} onHome={() => router.replace('/home')} />;

  const known = learnt ?? data.learntIds;
  const plan = buildPrepPlan(data.cards, known);

  const remember = (card: PrepCard, isLearnt: boolean) => {
    const next = new Set(known);
    if (isLearnt) next.add(card.id);
    else next.delete(card.id);
    setLearnt(next);

    // Fire and forget: the local state is the truth an auditor is looking at,
    // and a failed write simply means the card is unlearnt again next time.
    void (isLearnt ? markCardLearnt(card.id) : forgetCard(card.id));
  };

  return (
    <PrepScreen
      plan={plan}
      kicker={data.kicker}
      onGotIt={(card) => remember(card, true)}
      onAgain={(card) => remember(card, false)}
    />
  );
}
