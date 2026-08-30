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
import { surface, text } from '@/theme';

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
    <View style={{ flex: 1, backgroundColor: surface.ground, padding: space.md, paddingTop: 66 }}>
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
        <Text style={{ ...text('caption'), color: surface.body, letterSpacing: 1.2 }}>
          {DRAFT_LABELS[writeUp.state]}
        </Text>
        {savedAt ? (
          <Text style={{ ...text('caption'), color: surface.body, letterSpacing: 1.2 }}>
            AUTOSAVED {clockTime(savedAt)}
          </Text>
        ) : null}
      </View>

      <Text
        accessibilityRole="header"
        style={{ ...text('display'), fontSize: 22, color: surface.title, marginTop: 12 }}
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
          backgroundColor: writeUp.canSubmit ? surface.accent : 'transparent',
          borderWidth: writeUp.canSubmit ? 0 : 1,
          borderColor: surface.line,
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
            color: writeUp.canSubmit ? surface.onAccent : surface.muted,
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
        backgroundColor: surface.sheet,
        borderWidth: expanded ? 2 : 1,
        borderColor: expanded ? surface.warn : surface.line,
        borderRadius: radius.tile,
        padding: 14,
        gap: expanded ? 12 : 0,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ ...text('caption'), color: surface.muted }}>
          {String(moment.index).padStart(2, '0')}
        </Text>
        <Text style={{ ...text('title'), fontSize: 15, color: surface.title }}>
          {MOMENT_LABELS[moment.moment]}
        </Text>
        <Text
          style={{
            ...text('caption'),
            marginLeft: 'auto',
            // Nothing answered yet is not a pass. An unstarted moment reading
            // in the same colour as a clean one is the sort of thing an
            // auditor glances at once and gets wrong.
            color: !moment.complete
              ? surface.muted
              : moment.counts.fail > 0
                ? surface.fail
                : surface.pass,
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
            <Text style={{ ...text('caption'), color: surface.link, letterSpacing: 1 }}>EDIT</Text>
          </Pressable>
        ) : null}
      </View>

      {moment.markers.length > 0 && expanded ? (
        <Text style={{ ...text('caption'), color: surface.warn }}>
          {moment.markers.map((m) => `MARKER ${clockTime(m)}`).join(' · ')}
        </Text>
      ) : null}

      {expanded
        ? moment.checks.map((check) => {
            const answer = moment.answers.get(check.id);
            return (
              <View key={check.id} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text
                    style={{ ...text('body'), fontWeight: '600', flex: 1, color: surface.title }}
                  >
                    {check.prompt}
                  </Text>
                  <View
                    accessibilityLabel={`Verdict for ${check.prompt}`}
                    style={{
                      flexDirection: 'row',
                      borderWidth: 1,
                      borderColor: surface.line,
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
                              color: selected ? surface.onAccent : surface.muted,
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
                    borderColor: surface.line,
                    backgroundColor: surface.ground,
                    borderRadius: 4,
                    padding: 12,
                    fontSize: 12.5,
                    color: surface.body,
                  }}
                />
              </View>
            );
          })
        : null}
    </View>
  );
}
