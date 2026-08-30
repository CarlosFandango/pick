import {
  AUDITOR_STATUS,
  type AuditStatus,
  auditSubtitle,
  formatMoney,
  type StatusTone,
} from '@picksel/core';
import { color, radius, space, touchTarget } from '@picksel/tokens';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { surface, text } from '@/theme';

export interface MyAuditRow {
  id: string;
  title: string;
  dateLabel: string;
  feeMinorUnits: number | null;
  status: AuditStatus;
  extra?: string | null;
}

const TONE: Record<StatusTone, { fill?: string; ink: string }> = {
  neutral: { ink: surface.muted },
  progress: { fill: color.auditing, ink: color.auditingInk },
  good: { fill: color.teal, ink: surface.onAccent },
  info: { fill: color.navy, ink: surface.body },
};

/**
 * S2.5 — my audits.
 *
 * Rows became tappable when the app got navigation (TND-88): this is where an
 * auditor picks up a job, so it has to lead somewhere. Where it leads depends
 * on the state — prep before the shift, the session during, the write-up
 * after — and the route decides that, not this screen.
 */
export function MyAuditsScreen({
  audits,
  onOpen,
}: {
  audits: MyAuditRow[];
  onOpen?: (audit: MyAuditRow) => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: surface.ground, padding: space.md, paddingTop: 68 }}>
      <Text
        accessibilityRole="header"
        style={{ ...text('display'), fontSize: 24, color: surface.title }}
      >
        My audits
      </Text>

      <ScrollView style={{ marginTop: space.md }} contentContainerStyle={{ gap: 10 }}>
        {audits.length === 0 ? (
          <Text style={{ ...text('body'), color: surface.muted }}>
            Nothing yet. Accepted offers appear here.
          </Text>
        ) : null}

        {audits.map((audit) => {
          const chip = AUDITOR_STATUS[audit.status];
          const tone = TONE[chip.tone];

          return (
            <Pressable
              key={audit.id}
              accessibilityRole={onOpen ? 'button' : undefined}
              accessibilityLabel={`${audit.title}, ${chip.label}`}
              onPress={onOpen ? () => onOpen(audit) : undefined}
              style={{
                backgroundColor: surface.sheet,
                borderWidth: 1,
                borderColor: surface.line,
                borderRadius: radius.tile,
                padding: 14,
                minHeight: touchTarget.comfortable,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ ...text('title'), fontSize: 15, color: surface.title }}>
                  {audit.title}
                </Text>
                <Text style={{ ...text('body'), fontSize: 12, color: surface.muted, marginTop: 2 }}>
                  {auditSubtitle([
                    audit.dateLabel,
                    audit.feeMinorUnits === null ? null : formatMoney(audit.feeMinorUnits),
                    audit.extra,
                  ])}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: tone.fill ?? 'transparent',
                  borderWidth: tone.fill ? 0 : 1,
                  borderColor: surface.line,
                  borderRadius: radius.pill,
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                }}
              >
                <Text style={{ ...text('caption'), fontSize: 9.5, color: tone.ink }}>
                  {chip.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        style={{
          backgroundColor: surface.sheet,
          borderWidth: 1,
          borderColor: surface.line,
          borderRadius: radius.tile,
          padding: 14,
        }}
      >
        <Text style={{ ...text('body'), fontSize: 12, color: surface.muted }}>
          No team present counts as a completed job — paid in full, never against your record.
        </Text>
      </View>
    </View>
  );
}
