import { elapsedSince, type StagedSession } from '@picksel/core';
import { color, radius, space, touchTarget } from '@picksel/tokens';
import { Pressable, Text, View } from 'react-native';
import { text } from '@/theme';

/** How long an auditor waits before it counts as nobody turning up. */
export const WAIT_MINUTES = 45;

export function waitRemaining(session: StagedSession, now: Date): number {
  const waited = (now.getTime() - session.startedAt.getTime()) / 60_000;
  return Math.max(0, Math.ceil(WAIT_MINUTES - waited));
}

/**
 * S2.7 — nobody turned up.
 *
 * Deliberately undramatic. The auditor did their job by travelling and
 * waiting; this screen should not feel like reporting a failure, because it
 * is not one — they are paid in full and the client's credit is returned.
 */
export function NoShowScreen({
  session,
  now,
  areaLabel,
  onReport,
  onKeepWaiting,
  submitted = false,
}: {
  session: StagedSession;
  now: Date;
  areaLabel: string;
  onReport: () => void;
  onKeepWaiting: () => void;
  submitted?: boolean;
}) {
  const remaining = waitRemaining(session, now);
  const canReport = remaining === 0;

  if (submitted) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: color.fieldBg,
          padding: 22,
          paddingTop: 68,
          justifyContent: 'center',
          gap: space.sm,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ ...text('display'), fontSize: 26, color: color.onDark }}
        >
          Logged. Thank you.
        </Text>
        <Text style={{ ...text('body'), color: color.fieldMuted }}>
          You are paid in full for this shift. It does not count against your record, and the
          charity&rsquo;s credit has been returned.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.fieldBg, padding: 22, paddingTop: 68 }}>
      <Text style={{ ...text('caption'), color: color.fieldMuted, letterSpacing: 1.4 }}>
        {areaLabel.toUpperCase()} · WAITING
      </Text>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Text style={{ ...text('caption'), color: color.fieldMuted, letterSpacing: 2 }}>
          WAITED
        </Text>
        <Text
          accessibilityLabel={`Waited ${elapsedSince(session.startedAt, session.endedAt ?? now)}`}
          style={{ ...text('display'), fontSize: 56, color: color.onDark }}
        >
          {elapsedSince(session.startedAt, session.endedAt ?? now)}
        </Text>
        <Text style={{ ...text('caption'), color: color.fieldMuted, letterSpacing: 1.4 }}>
          {canReport ? `${WAIT_MINUTES} MINUTES REACHED` : `${remaining} MIN UNTIL YOU CAN REPORT`}
        </Text>
      </View>

      <View style={{ gap: space.sm }}>
        <Pressable
          accessibilityRole="button"
          disabled={!canReport}
          onPress={onReport}
          style={{
            backgroundColor: canReport ? color.teal : color.fieldSheet,
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
              color: canReport ? color.onDark : color.fieldDim,
            }}
          >
            Report no team present
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onKeepWaiting}
          style={{ alignSelf: 'center' }}
        >
          <Text style={{ ...text('body'), color: color.fieldMuted }}>They have arrived</Text>
        </Pressable>
      </View>
    </View>
  );
}
