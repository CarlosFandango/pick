import {
  clockTime,
  elapsed,
  type FieldSession,
  type FlagSeverity,
  isLastMoment,
  MOMENT_LABELS,
  momentRows,
} from '@picksel/core';
import { color, radius, space, touchTarget } from '@picksel/tokens';
import { Pressable, Text, View } from 'react-native';
import { text } from '@/theme';

/**
 * S1.5b — the field session.
 *
 * Dark, because it is read on a street. One tap advances the shift. Nothing on
 * this screen asks the auditor to read or decide: every judgement waits for
 * write-up, when they are not standing next to the person they are observing.
 */
export function FieldSessionScreen({
  session,
  now,
  areaLabel,
  onAdvance,
  onFlag,
  onEnd,
}: {
  session: FieldSession;
  now: Date;
  areaLabel: string;
  onAdvance: () => void;
  onFlag: () => void;
  onEnd: () => void;
}) {
  const rows = momentRows(session);
  const finished = isLastMoment(session);

  return (
    <View style={{ flex: 1, backgroundColor: color.fieldBg, padding: 22, paddingTop: 68 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ ...text('caption'), color: color.fieldMuted, letterSpacing: 1.4 }}>
          {areaLabel.toUpperCase()}
        </Text>
        <Text
          accessibilityLabel={`Session running ${elapsed(session, now)}`}
          style={{ ...text('caption'), color: color.fieldMuted, letterSpacing: 1.4 }}
        >
          {elapsed(session, now)}
        </Text>
      </View>

      <View style={{ flex: 1, gap: 6, marginTop: 18 }}>
        {rows.map((row) => (
          <View
            key={row.moment}
            accessibilityLabel={`${MOMENT_LABELS[row.moment]} ${row.state}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: row.state === 'current' ? 16 : 13,
              paddingHorizontal: 14,
              borderRadius: radius.tile,
              backgroundColor: row.state === 'current' ? 'rgba(242,169,0,0.14)' : 'transparent',
              borderWidth: row.state === 'current' ? 1 : 0,
              borderColor: 'rgba(242,169,0,0.5)',
            }}
          >
            <Text
              style={{
                ...text('caption'),
                color: row.state === 'current' ? color.auditing : color.fieldMuted,
                width: 20,
              }}
            >
              {String(row.index).padStart(2, '0')}
            </Text>
            <Text
              style={{
                ...text('title'),
                fontSize: row.state === 'current' ? 17 : 15,
                color:
                  row.state === 'upcoming'
                    ? color.fieldDim
                    : row.state === 'current'
                      ? color.onDark
                      : color.fieldMuted,
              }}
            >
              {MOMENT_LABELS[row.moment]}
            </Text>
            <Text
              style={{
                ...text('caption'),
                marginLeft: 'auto',
                color: row.state === 'current' ? color.auditing : color.fieldMuted,
                letterSpacing: row.state === 'current' ? 1 : 0,
              }}
            >
              {row.state === 'current' ? 'NOW' : row.occurredAt ? clockTime(row.occurredAt) : ''}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Pressable
          accessibilityRole="button"
          onPress={finished ? onEnd : onAdvance}
          style={{
            flex: 1,
            backgroundColor: color.teal,
            borderRadius: radius.pill,
            paddingVertical: 16,
            alignItems: 'center',
            minHeight: touchTarget.comfortable,
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...text('title'), fontSize: 15, color: color.onDark }}>
            {finished ? 'END SESSION' : 'NEXT MOMENT'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Flag"
          onPress={onFlag}
          style={{
            width: touchTarget.comfortable,
            height: touchTarget.comfortable,
            borderRadius: radius.pill,
            borderWidth: 1.5,
            borderColor: 'rgba(244,239,230,0.4)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...text('caption'), color: color.onDark }}>FLAG</Text>
        </Pressable>
      </View>
    </View>
  );
}

const SEVERITIES: { value: FlagSeverity; label: string; hint: string }[] = [
  { value: 'wrong', label: 'Wrong', hint: 'Against the rules' },
  { value: 'note', label: 'Note', hint: 'Worth mentioning' },
  { value: 'fine', label: 'Fine', hint: 'Did it well' },
];

/**
 * S2.3 — the flag sheet.
 *
 * Three choices and no text field. Typing on a street means looking down, and
 * an auditor looking down is an auditor not watching.
 */
export function FlagSheet({
  onChoose,
  onCancel,
}: {
  onChoose: (severity: FlagSeverity) => void;
  onCancel: () => void;
}) {
  return (
    <View
      accessibilityLabel="Flag this moment"
      style={{ backgroundColor: color.fieldSheet, padding: space.md, gap: space.sm }}
    >
      <Text style={{ ...text('caption'), color: color.fieldMuted, letterSpacing: 1.4 }}>
        FLAG THIS MOMENT
      </Text>
      {SEVERITIES.map((severity) => (
        <Pressable
          key={severity.value}
          accessibilityRole="button"
          onPress={() => onChoose(severity.value)}
          style={{
            borderRadius: radius.tile,
            borderWidth: 1,
            borderColor: color.fieldDim,
            padding: space.md,
            minHeight: touchTarget.comfortable,
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...text('title'), fontSize: 16, color: color.onDark }}>
            {severity.label}
          </Text>
          <Text style={{ ...text('caption'), color: color.fieldMuted }}>{severity.hint}</Text>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={onCancel}
        style={{ alignSelf: 'center', padding: space.sm }}
      >
        <Text style={{ ...text('body'), color: color.fieldMuted }}>Cancel</Text>
      </Pressable>
    </View>
  );
}
