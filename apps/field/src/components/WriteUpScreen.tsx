import {
  clockTime,
  DRAFT_LABELS,
  MOMENT_LABELS,
  momentSummary,
  submitLabel,
  type Verdict,
  type WriteUp,
  type WriteUpCheck,
  type WriteUpMoment,
} from '@picksel/core';
import { color, radius, space, touchTarget } from '@picksel/tokens';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { text } from '@/theme';

const VERDICTS: Verdict[] = ['pass', 'fail', 'note'];

const VERDICT_FILL: Record<Verdict, string> = {
  pass: color.teal,
  fail: color.creativeText,
  note: color.auditingText,
};

/**
 * S1.6 — write-up.
 *
 * The same sequence as prep and the field session, replayed as something to
 * judge. Every moment stays editable until submit; after PICK returns it, only
 * the moments they flagged reopen.
 */
export function WriteUpScreen({
  writeUp,
  title,
  savedAt,
  openMoment,
  onOpenMoment,
  onAnswer,
  onNote,
  onSubmit,
}: {
  writeUp: WriteUp;
  title: string;
  savedAt?: Date | null;
  openMoment: string | null;
  onOpenMoment: (moment: string) => void;
  onAnswer: (check: WriteUpCheck, verdict: Verdict) => void;
  onNote: (check: WriteUpCheck, note: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: color.bone, padding: space.md, paddingTop: 66 }}>
      <View
        style={{
          backgroundColor: color.navy,
          borderRadius: 4,
          paddingVertical: 8,
          paddingHorizontal: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ ...text('caption'), color: color.onDarkMuted, letterSpacing: 1.2 }}>
          {DRAFT_LABELS[writeUp.state]}
        </Text>
        {savedAt ? (
          <Text style={{ ...text('caption'), color: color.onDarkMuted, letterSpacing: 1.2 }}>
            AUTOSAVED {clockTime(savedAt)}
          </Text>
        ) : null}
      </View>

      <Text
        accessibilityRole="header"
        style={{ ...text('display'), fontSize: 22, color: color.ink, marginTop: 12 }}
      >
        {title}
      </Text>

      <ScrollView style={{ marginTop: 12 }} contentContainerStyle={{ gap: space.xs }}>
        {writeUp.moments.map((moment) => (
          <MomentBlock
            key={moment.moment}
            moment={moment}
            open={openMoment === moment.moment}
            onOpen={() => onOpenMoment(moment.moment)}
            onAnswer={onAnswer}
            onNote={onNote}
          />
        ))}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        disabled={!writeUp.canSubmit}
        onPress={onSubmit}
        style={{
          marginTop: 12,
          backgroundColor: writeUp.canSubmit ? color.teal : color.oat,
          borderRadius: radius.pill,
          paddingVertical: 16,
          alignItems: 'center',
          minHeight: touchTarget.comfortable,
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            ...text('title'),
            fontSize: 15,
            color: writeUp.canSubmit ? color.bone : color.paper,
          }}
        >
          {submitLabel(writeUp)}
        </Text>
      </Pressable>
    </View>
  );
}

function MomentBlock({
  moment,
  open,
  onOpen,
  onAnswer,
  onNote,
}: {
  moment: WriteUpMoment;
  open: boolean;
  onOpen: () => void;
  onAnswer: (check: WriteUpCheck, verdict: Verdict) => void;
  onNote: (check: WriteUpCheck, note: string) => void;
}) {
  const expanded = open && moment.editable;

  return (
    <View
      style={{
        backgroundColor: color.paper,
        borderWidth: expanded ? 2 : 1,
        borderColor: expanded ? color.auditing : color.oat,
        borderRadius: radius.tile,
        padding: 14,
        gap: expanded ? 12 : 0,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ ...text('caption'), color: color.muted }}>
          {String(moment.index).padStart(2, '0')}
        </Text>
        <Text style={{ ...text('title'), fontSize: 15, color: color.ink }}>
          {MOMENT_LABELS[moment.moment]}
        </Text>
        <Text
          style={{
            ...text('caption'),
            marginLeft: 'auto',
            color: moment.counts.fail > 0 ? color.creativeText : color.teal,
          }}
        >
          {momentSummary(moment)}
        </Text>
        {moment.editable && !expanded ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${MOMENT_LABELS[moment.moment]}`}
            onPress={onOpen}
          >
            <Text style={{ ...text('caption'), color: color.link, letterSpacing: 1 }}>EDIT</Text>
          </Pressable>
        ) : null}
      </View>

      {moment.markers.length > 0 && expanded ? (
        <Text style={{ ...text('caption'), color: color.auditingText }}>
          {moment.markers.map((m) => `MARKER ${clockTime(m)}`).join(' · ')}
        </Text>
      ) : null}

      {expanded
        ? moment.checks.map((check) => {
            const answer = moment.answers.get(check.id);
            return (
              <View key={check.id} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ ...text('body'), fontWeight: '600', flex: 1, color: color.ink }}>
                    {check.prompt}
                  </Text>
                  <View
                    accessibilityLabel={`Verdict for ${check.prompt}`}
                    style={{
                      flexDirection: 'row',
                      borderWidth: 1,
                      borderColor: color.oat,
                      borderRadius: radius.pill,
                      overflow: 'hidden',
                    }}
                  >
                    {VERDICTS.map((verdict) => {
                      const selected = answer?.verdict === verdict;
                      return (
                        <Pressable
                          key={verdict}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => onAnswer(check, verdict)}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            backgroundColor: selected ? VERDICT_FILL[verdict] : 'transparent',
                          }}
                        >
                          <Text
                            style={{
                              ...text('caption'),
                              color: selected ? color.bone : color.muted,
                            }}
                          >
                            {verdict.toUpperCase()}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <TextInput
                  accessibilityLabel={`Note for ${check.prompt}`}
                  placeholder="+ ADD NOTE"
                  defaultValue={answer?.note ?? ''}
                  onChangeText={(value) => onNote(check, value)}
                  multiline
                  style={{
                    borderWidth: 1,
                    borderColor: color.oat,
                    backgroundColor: color.bone,
                    borderRadius: 4,
                    padding: 12,
                    fontSize: 12.5,
                    color: color.bodyBrown,
                  }}
                />
              </View>
            );
          })
        : null}
    </View>
  );
}
