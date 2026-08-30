import {
  type AuditStatus,
  auditorDayLede,
  formatDayLong,
  formatMoney,
  type PaymentState,
} from '@picksel/core';
import { color, radius, space, touchTarget } from '@picksel/tokens';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { surface, text } from '@/theme';

export interface HomeAudit {
  id: string;
  title: string;
  dateLabel: string;
  /** Where, at the coarseness the auditor needs before they set off. */
  area: string;
  windowLabel: string | null;
  status: AuditStatus;
  /**
   * What is due on this job — "Prep", "Write up", or null when nothing is.
   * Decided by the route rule, not by this screen: two lists guessing
   * separately is how they come to disagree.
   */
  action: string | null;
}

export interface HomePayment {
  auditId: string;
  title: string;
  dateLabel: string;
  state: PaymentState;
  stateLabel: string;
  amountMinorUnits: number;
  reference: string | null;
}

/**
 * S5.3 — home (TND-95, parts 1–3).
 *
 * Home is the auditor's own work, not the offer board. Somebody with a shift
 * today does not open the app to browse; they open it to check what is next.
 * Offers stays a tab, for the auditor who has nothing on.
 *
 * Everything here is read-only. Nothing on this screen changes anything —
 * every action lives on the screen it links to, so there is no state to lose
 * when the signal goes.
 *
 * Part 4, complaints, is deliberately absent: what that means for an auditor
 * is an open question (TND-97), and guessing would build the wrong thing.
 */
export function HomeScreen({
  next,
  upcoming,
  payments,
  onOpen,
  today = new Date(),
}: {
  next: HomeAudit | null;
  upcoming: readonly HomeAudit[];
  payments: readonly HomePayment[];
  onOpen?: (audit: HomeAudit) => void;
  /** Injectable so the screen is testable without freezing the clock. */
  today?: Date;
}) {
  const owed = payments
    .filter((payment) => payment.state !== 'paid')
    .reduce((sum, payment) => sum + payment.amountMinorUnits, 0);

  const day = auditorDayLede({
    dueAction: next?.action ?? null,
    upcoming: upcoming.length,
    owedMinorUnits: owed,
  });
  const todayLabel = formatDayLong(today);

  return (
    <View style={{ flex: 1, backgroundColor: surface.ground }}>
      <ScrollView
        contentContainerStyle={{
          padding: space.md,
          paddingTop: 68,
          gap: space.lg,
          paddingBottom: 40,
        }}
      >
        {/*
          The answer first. "Today" is a page title, not an answer — and an
          auditor checks this one-handed on the way somewhere, asking the same
          question every time: is anything due from me right now.
        */}
        <View style={{ gap: 6 }}>
          <Text style={{ ...text('caption'), color: surface.muted }}>{todayLabel}</Text>
          <Text
            accessibilityRole="header"
            style={{ ...text('display'), fontSize: 24, color: surface.title }}
          >
            {day.headline}
          </Text>
          {day.detail ? (
            <Text style={{ ...text('body'), color: surface.body }}>{day.detail}</Text>
          ) : null}
        </View>

        {/* 1 — the largest thing on the screen, because it is why the app was opened. */}
        {next ? (
          <View
            style={{
              backgroundColor: surface.sheet,
              borderRadius: radius.tile,
              padding: space.md,
              gap: 6,
            }}
          >
            <Text style={{ ...text('caption'), color: surface.muted }}>NEXT AUDIT</Text>
            <Text style={{ ...text('title'), color: surface.title }}>{next.title}</Text>
            <Text style={{ ...text('body'), color: surface.body }}>{next.dateLabel}</Text>
            {next.windowLabel ? (
              <Text style={{ ...text('body'), color: surface.body }}>{next.windowLabel}</Text>
            ) : null}

            {/*
              One action, and it is whatever is actually due — prep before the
              shift, the write-up after. There is no audit detail screen to
              send anyone to, and a second button leading to the same place
              would be an unused option, which is a permanent question.

              It stays one tap from opening the app: an auditor reads prep on
              the way to a pitch, underground, with no signal.
            */}
            {next.action ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${next.action} for ${next.title}`}
                onPress={onOpen ? () => onOpen(next) : undefined}
                style={{
                  backgroundColor: color.teal,
                  borderRadius: radius.pill,
                  minHeight: touchTarget.comfortable,
                  justifyContent: 'center',
                  paddingHorizontal: 22,
                  alignSelf: 'flex-start',
                  marginTop: 10,
                }}
              >
                <Text style={{ ...text('body'), color: surface.onAccent }}>{next.action}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* 2 — enough per row to plan a week around. */}
        {upcoming.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={{ ...text('caption'), color: surface.muted }}>COMING UP</Text>
            {upcoming.map((audit) => (
              <Pressable
                key={audit.id}
                accessibilityRole="button"
                accessibilityLabel={`${audit.title}, ${audit.dateLabel}`}
                onPress={onOpen ? () => onOpen(audit) : undefined}
                style={{
                  backgroundColor: surface.sheet,
                  borderRadius: radius.tile,
                  padding: space.md,
                  minHeight: touchTarget.comfortable,
                  gap: 2,
                }}
              >
                <Text style={{ ...text('body'), color: surface.title }}>{audit.title}</Text>
                <Text style={{ ...text('caption'), color: surface.muted }}>
                  {audit.dateLabel}
                  {audit.windowLabel ? ` · ${audit.windowLabel}` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* 3 — the question auditors ask most. */}
        {payments.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={{ ...text('caption'), color: surface.muted }}>SUBMITTED</Text>
            {payments.map((payment) => (
              <View
                key={payment.auditId}
                style={{
                  backgroundColor: surface.sheet,
                  borderRadius: radius.tile,
                  padding: space.md,
                  gap: 4,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <Text style={{ ...text('body'), color: surface.title, flex: 1 }}>
                    {payment.title}
                  </Text>
                  <Text style={{ ...text('body'), color: surface.title }}>
                    {formatMoney(payment.amountMinorUnits, 'GBP')}
                  </Text>
                </View>
                {/*
                  The state is a sentence, never a colour alone — this is read
                  outdoors in daylight, and "paid" and "held" must not depend on
                  telling two chips apart.
                */}
                <Text style={{ ...text('caption'), color: surface.muted }}>
                  {payment.dateLabel} · {payment.stateLabel}
                  {payment.reference ? ` · ${payment.reference}` : ''}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
