import {
  type EarningLine,
  formatMoney,
  nextRunLabel,
  pendingLine,
  summariseEarnings,
} from '@picksel/core';
import { color, fontSize, radius, space } from '@picksel/tokens';
import { ScrollView, Text, View } from 'react-native';
import { text } from '@/theme';

/** S2.6 — earnings. Itemised always: base and travel are never one number. */
export function EarningsScreen({ lines, nextRun }: { lines: EarningLine[]; nextRun: Date | null }) {
  const summary = summariseEarnings(lines);

  return (
    <View style={{ flex: 1, backgroundColor: color.bone, padding: space.md, paddingTop: 68 }}>
      <Text
        accessibilityRole="header"
        style={{ ...text('display', fontSize.xl), color: color.ink }}
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
          accessibilityLabel={`Pending ${formatMoney(summary.pendingMinorUnits)}`}
          style={{ ...text('display', fontSize.xxl), color: color.onDark, marginTop: 4 }}
        >
          {formatMoney(summary.pendingMinorUnits)}
        </Text>
        <Text style={{ ...text('body', fontSize.xs), color: color.onDarkMuted, marginTop: 2 }}>
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
              <Text style={{ ...text('title', fontSize.md), color: color.ink }}>{line.title}</Text>
              <Text style={{ ...text('body', fontSize.xs), color: color.muted, marginTop: 2 }}>
                {line.dateLabel} · {formatMoney(line.baseMinorUnits)} audit
                {line.travelMinorUnits > 0 ? ` + ${formatMoney(line.travelMinorUnits)} travel` : ''}
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
