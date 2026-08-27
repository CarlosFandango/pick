import {
  cardPosition,
  MOMENT_LABELS,
  type MomentProgress,
  orderedMoments,
  type PrepCard,
  type PrepPlan,
} from '@picksel/core';
import { color, fontSize, radius, space } from '@picksel/tokens';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { text } from '@/theme';

/**
 * S1.4 — prep.
 *
 * The shift as a sequence. The auditor works the current moment; the rest are
 * a checklist of where they are. Only the current moment expands, because a
 * screen full of open cards is not a sequence.
 */
export function PrepScreen({
  plan,
  kicker,
  onGotIt,
  onAgain,
}: {
  plan: PrepPlan;
  kicker: string;
  onGotIt: (card: PrepCard) => void;
  onAgain: (card: PrepCard) => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: color.bone, padding: space.md, paddingTop: 68 }}>
      <Text style={{ ...text('caption'), color: color.muted, letterSpacing: 1.4 }}>
        {kicker.toUpperCase()}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: 8 }}>
        <Text
          accessibilityRole="header"
          style={{ ...text('display', fontSize.lg), color: color.ink }}
        >
          Know the shift
        </Text>
        <Text
          accessibilityLabel={`${plan.learnt} of ${plan.total} learnt`}
          style={{ ...text('caption'), color: color.auditingText, marginLeft: 'auto' }}
        >
          {plan.learnt} / {plan.total} LEARNT
        </Text>
      </View>

      <ScrollView style={{ marginTop: space.md }} contentContainerStyle={{ gap: space.xs }}>
        {orderedMoments(plan).map((moment, index) => (
          <MomentRow
            key={moment.moment}
            index={index + 1}
            progress={moment}
            active={moment.moment === plan.currentMoment}
            onGotIt={onGotIt}
            onAgain={onAgain}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function MomentRow({
  index,
  progress,
  active,
  onGotIt,
  onAgain,
}: {
  index: number;
  progress: MomentProgress;
  active: boolean;
  onGotIt: (card: PrepCard) => void;
  onAgain: (card: PrepCard) => void;
}) {
  const complete = progress.learnt === progress.total;
  const card = progress.nextCard;

  return (
    <View
      style={{
        backgroundColor: color.paper,
        borderWidth: active ? 2 : 1,
        borderColor: active ? color.auditing : color.oat,
        borderRadius: radius.tile,
        padding: active ? space.md : 12,
        gap: active ? space.sm : 0,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ ...text('caption'), color: color.muted, width: 20 }}>
          {String(index).padStart(2, '0')}
        </Text>
        <Text style={{ ...text('title', fontSize.sm), color: color.ink }}>
          {MOMENT_LABELS[progress.moment]}
        </Text>
        <Text
          accessibilityLabel={`${MOMENT_LABELS[progress.moment]}: ${progress.learnt} of ${progress.total}`}
          style={{
            ...text('caption'),
            marginLeft: 'auto',
            color: complete ? color.teal : progress.learnt > 0 ? color.auditingText : color.muted,
          }}
        >
          {progress.learnt}/{progress.total}
        </Text>
      </View>

      {active && card ? (
        <View style={{ backgroundColor: color.bone, borderRadius: 4, padding: space.md, gap: 10 }}>
          <Text style={{ ...text('caption'), color: color.muted, letterSpacing: 1.2 }}>
            CARD {cardPosition(progress, card)} OF {progress.total}
          </Text>
          <Text style={{ ...text('title', fontSize.md), color: color.ink }}>{card.prompt}</Text>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onGotIt(card)}
              style={{
                flex: 1,
                backgroundColor: color.teal,
                borderRadius: radius.pill,
                paddingVertical: 10,
                alignItems: 'center',
              }}
            >
              <Text style={{ ...text('body'), fontWeight: '700', color: color.bone }}>Got it</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => onAgain(card)}
              style={{
                flex: 1,
                borderWidth: 1.5,
                borderColor: color.ink,
                borderRadius: radius.pill,
                paddingVertical: 9,
                alignItems: 'center',
              }}
            >
              <Text style={{ ...text('body'), fontWeight: '700', color: color.ink }}>Again</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
