import {
  type EarningLine,
  formatMoney,
  nextRunLabel,
  pendingLine,
  summariseEarnings,
} from '@picksel/core';
import { color, radius, space } from '@picksel/tokens';
import { ScrollView, Text, View } from 'react-native';
import { surface, text } from '@/theme';

/** S2.6 — earnings. Itemised always: base and travel are never one number. */
export function EarningsScreen({ lines, nextRun }: { lines: EarningLine[]; nextRun: Date | null }) {
  const summary = summariseEarnings(lines);

  return (
    <View style={{ flex: 1, backgroundColor: surface.ground, padding: space.md, paddingTop: 68 }}>
      <Text
        accessibilityRole="header"
        style={{ ...text('display'), fontSize: 24, color: surface.title }}
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
        <Text style={{ ...text('caption'), color: surface.body, letterSpacing: 1.4 }}>
          {nextRunLabel(nextRun)}
        </Text>
        <Text
          accessibilityLabel={`Pending ${formatMoney(summary.pendingMinorUnits)}`}
          style={{ ...text('display'), fontSize: 40, color: surface.title, marginTop: 4 }}
        >
          {formatMoney(summary.pendingMinorUnits)}
        </Text>
        <Text style={{ ...text('body'), fontSize: 12.5, color: surface.body, marginTop: 2 }}>
          {pendingLine(summary)}
        </Text>
      </View>

      <ScrollView style={{ marginTop: 14, flex: 1 }} contentContainerStyle={{ gap: 8 }}>
        {lines.map((line) => (
          <View
            key={line.auditId}
            accessibilityLabel={`${line.title}, ${line.state}`}
            style={{
              backgroundColor: surface.sheet,
              borderWidth: 1,
              borderColor: surface.line,
              borderRadius: radius.tile,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ ...text('title'), fontSize: 15, color: surface.title }}>
                {line.title}
              </Text>
              <Text style={{ ...text('body'), fontSize: 12, color: surface.muted, marginTop: 2 }}>
                {line.dateLabel} · {formatMoney(line.baseMinorUnits)} audit
                {line.travelMinorUnits > 0 ? ` + ${formatMoney(line.travelMinorUnits)} travel` : ''}
              </Text>
            </View>
            <Text
              style={{
                ...text('caption'),
                color: line.state === 'paid' ? surface.pass : surface.muted,
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
