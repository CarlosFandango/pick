import {
  type EarningLine,
  nextRunLabel,
  pendingLine,
  poundsFromPence,
  summariseEarnings,
} from '@picksel/core';
import { color, radius, space } from '@picksel/tokens';
import { ScrollView, Text, View } from 'react-native';
import { text } from '@/theme';

/** S2.6 — earnings. Itemised always: base and travel are never one number. */
export function EarningsScreen({ lines, nextRun }: { lines: EarningLine[]; nextRun: Date | null }) {
  const summary = summariseEarnings(lines);

  return (
    <View style={{ flex: 1, backgroundColor: color.bone, padding: space.md, paddingTop: 68 }}>
      <Text
        accessibilityRole="header"
        style={{ ...text('display'), fontSize: 24, color: color.ink }}
      >
        Earnings
      </Text>

      <View
        style={{
          marginTop: 14,
          backgroundColor: color.navy,
          borderRadius: radius.tile,
          padding: space.lg,
        }}
      >
        <Text style={{ ...text('caption'), color: color.onDarkMuted, letterSpacing: 1.4 }}>
          {nextRunLabel(nextRun)}
        </Text>
        <Text
          accessibilityLabel={`Pending ${poundsFromPence(summary.pendingPence)}`}
          style={{ ...text('display'), fontSize: 40, color: color.onDark, marginTop: 4 }}
        >
          {poundsFromPence(summary.pendingPence)}
        </Text>
        <Text style={{ ...text('body'), fontSize: 12.5, color: color.onDarkMuted, marginTop: 2 }}>
          {pendingLine(summary)}
        </Text>
      </View>

      <ScrollView style={{ marginTop: 14, flex: 1 }} contentContainerStyle={{ gap: 8 }}>
        {lines.map((line) => (
          <View
            key={line.auditId}
            accessibilityLabel={`${line.title}, ${line.state}`}
            style={{
              backgroundColor: color.paper,
              borderWidth: 1,
              borderColor: color.oat,
              borderRadius: radius.tile,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ ...text('title'), fontSize: 15, color: color.ink }}>{line.title}</Text>
              <Text style={{ ...text('body'), fontSize: 12, color: color.muted, marginTop: 2 }}>
                {line.dateLabel} · {poundsFromPence(line.basePence)} audit
                {line.travelPence > 0 ? ` + ${poundsFromPence(line.travelPence)} travel` : ''}
              </Text>
            </View>
            <Text
              style={{
                ...text('caption'),
                color: line.state === 'paid' ? color.teal : color.muted,
              }}
            >
              {line.state === 'paid' ? 'PAID' : 'PENDING'}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
