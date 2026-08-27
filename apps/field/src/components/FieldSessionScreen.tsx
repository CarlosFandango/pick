import {
  type AuditStage,
  clockTime,
  elapsedSince,
  type FlagSeverity,
  isLastStage,
  permissions,
  type StagedSession,
  currentStage as stageNow,
  stageRows,
  tallyCount,
} from '@picksel/core';
import { color, fontSize, radius, space, touchTarget } from '@picksel/tokens';
import { Pressable, Text, View } from 'react-native';
import { text } from '@/theme';

/**
 * S1.5b — the field session, stage by stage (TND-83).
 *
 * Dark, because it is read on a street. What changes between stages is not the
 * styling but what the auditor is physically able to do:
 *
 *   observation — a bystander at a distance. The phone is permitted, so this
 *                 is where tallies and markers live.
 *   interaction — being pitched to. Nothing to fill in. The stage list is a
 *                 rehearsal surface on the way there and a recall scaffold
 *                 afterwards; the only live control is one discreet marker.
 *
 * Every judgement still waits for write-up, when the auditor is not standing
 * next to the person they are observing.
 */

/** What an observation stage counts. Enumerated, not authored. */
export const COUNTERS: { key: string; label: string }[] = [
  { key: 'approaches', label: 'Approaches' },
  { key: 'stops', label: 'Stops' },
  { key: 'asks', label: 'Asks' },
];

export function FieldSessionScreen({
  stages,
  session,
  now,
  areaLabel,
  onAdvance,
  onTally,
  onFlag,
  onEnd,
}: {
  stages: readonly AuditStage[];
  session: StagedSession;
  now: Date;
  areaLabel: string;
  onAdvance: () => void;
  onTally: (counterKey: string) => void;
  onFlag: () => void;
  onEnd: () => void;
}) {
  const rows = stageRows(stages, session);
  const current = stageNow(stages, session);
  const finished = isLastStage(stages, session);
  const allowed = current ? permissions(current) : { tallies: false, notes: false, markers: false };
  const running = elapsedSince(session.startedAt, session.endedAt ?? now);

  return (
    <View style={{ flex: 1, backgroundColor: color.fieldBg, padding: 22, paddingTop: 68 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ ...text('caption'), color: color.fieldMuted, letterSpacing: 1.4 }}>
          {areaLabel.toUpperCase()}
        </Text>
        <Text
          accessibilityLabel={`Session running ${running}`}
          style={{ ...text('caption'), color: color.fieldMuted, letterSpacing: 1.4 }}
        >
          {running}
        </Text>
      </View>

      <View style={{ flex: 1, gap: 6, marginTop: 18 }}>
        {rows.map((row) => (
          <View
            key={row.stage.key}
            accessibilityLabel={`${row.stage.label} ${row.state}`}
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
                flexShrink: 1,
                color:
                  row.state === 'upcoming'
                    ? color.fieldDim
                    : row.state === 'current'
                      ? color.onDark
                      : color.fieldMuted,
              }}
            >
              {row.stage.label}
            </Text>
            <Text
              style={{
                ...text('caption'),
                marginLeft: 'auto',
                color: row.state === 'current' ? color.auditing : color.fieldMuted,
                letterSpacing: row.state === 'current' ? 1 : 0,
              }}
            >
              {row.state === 'current' ? 'NOW' : row.enteredAt ? clockTime(row.enteredAt) : ''}
            </Text>
          </View>
        ))}
      </View>

      {/*
        Tallies exist only where the auditor can be seen holding a phone. This
        is the rule from TND-83, not a layout choice — rendering counters
        during a mystery shop would ask an auditor to tap a screen while
        someone is talking to them.
      */}
      {current && allowed.tallies ? (
        <View
          accessibilityLabel="Counters"
          style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}
        >
          {COUNTERS.map((counter) => (
            <Pressable
              key={counter.key}
              accessibilityRole="button"
              accessibilityLabel={`${counter.label}, ${tallyCount(session, current.key, counter.key)} so far`}
              onPress={() => onTally(counter.key)}
              style={{
                flex: 1,
                borderRadius: radius.tile,
                borderWidth: 1,
                borderColor: color.fieldDim,
                paddingVertical: 12,
                alignItems: 'center',
                minHeight: touchTarget.comfortable,
                justifyContent: 'center',
              }}
            >
              <Text style={{ ...text('title', fontSize.lg), color: color.onDark }}>
                {tallyCount(session, current.key, counter.key)}
              </Text>
              <Text style={{ ...text('caption'), color: color.fieldMuted }}>{counter.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {current && !allowed.tallies ? (
        <Text
          style={{ ...text('caption'), color: color.fieldDim, marginBottom: 14, letterSpacing: 1 }}
        >
          NOTHING TO RECORD NOW — WRITE IT UP AFTERWARDS
        </Text>
      ) : null}

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
          <Text style={{ ...text('title', fontSize.md), color: color.onDark }}>
            {finished ? 'END SESSION' : 'NEXT STAGE'}
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
 * an auditor looking down is an auditor not watching. This is the one control
 * that stays available during an interaction stage, because it is a single tap.
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
      accessibilityLabel="Flag this stage"
      style={{ backgroundColor: color.fieldSheet, padding: space.md, gap: space.sm }}
    >
      <Text style={{ ...text('caption'), color: color.fieldMuted, letterSpacing: 1.4 }}>
        FLAG THIS STAGE
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
          <Text style={{ ...text('title', fontSize.md), color: color.onDark }}>
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
