import {
  AUDITOR_STATUS,
  type AuditStatus,
  auditSubtitle,
  poundsFromPence,
  type StatusTone,
} from '@picksel/core';
import { color, fontSize, radius, space } from '@picksel/tokens';
import { ScrollView, Text, View } from 'react-native';
import { text } from '@/theme';

export interface MyAuditRow {
  id: string;
  title: string;
  dateLabel: string;
  feePence: number | null;
  status: AuditStatus;
  extra?: string | null;
}

const TONE: Record<StatusTone, { fill?: string; ink: string }> = {
  neutral: { ink: color.muted },
  progress: { fill: color.auditing, ink: color.auditingInk },
  good: { fill: color.teal, ink: color.bone },
  info: { fill: color.navy, ink: color.onDarkMuted },
};

/** S2.5 — my audits. */
export function MyAuditsScreen({ audits }: { audits: MyAuditRow[] }) {
  return (
    <View style={{ flex: 1, backgroundColor: color.bone, padding: space.md, paddingTop: 68 }}>
      <Text
        accessibilityRole="header"
        style={{ ...text('display', fontSize.xl), color: color.ink }}
      >
        My audits
      </Text>

      <ScrollView style={{ marginTop: space.md }} contentContainerStyle={{ gap: 10 }}>
        {audits.length === 0 ? (
          <Text style={{ ...text('body'), color: color.muted }}>
            Nothing yet. Accepted offers appear here.
          </Text>
        ) : null}

        {audits.map((audit) => {
          const chip = AUDITOR_STATUS[audit.status];
          const tone = TONE[chip.tone];

          return (
            <View
              key={audit.id}
              accessibilityLabel={`${audit.title}, ${chip.label}`}
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
                <Text style={{ ...text('title', fontSize.md), color: color.ink }}>
                  {audit.title}
                </Text>
                <Text
                  style={{
                    ...text('body', fontSize.xs),
                    color: color.muted,
                    marginTop: 2,
                  }}
                >
                  {auditSubtitle([
                    audit.dateLabel,
                    audit.feePence === null ? null : poundsFromPence(audit.feePence),
                    audit.extra,
                  ])}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: tone.fill ?? 'transparent',
                  borderWidth: tone.fill ? 0 : 1,
                  borderColor: color.oat,
                  borderRadius: radius.pill,
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                }}
              >
                <Text style={{ ...text('caption', fontSize.xs), color: tone.ink }}>
                  {chip.label}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View
        style={{
          backgroundColor: color.paper,
          borderWidth: 1,
          borderColor: color.oat,
          borderRadius: radius.tile,
          padding: 14,
        }}
      >
        <Text style={{ ...text('body', fontSize.xs), color: color.muted }}>
          No team present counts as a completed job — paid in full, never against your record.
        </Text>
      </View>
    </View>
  );
}
