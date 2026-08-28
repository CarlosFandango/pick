import { type AuditStatus, formatMoney, type PaymentState } from '@picksel/core';
import { color, radius, space, touchTarget } from '@picksel/tokens';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { text } from '@/theme';

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
}: {
  next: HomeAudit | null;
  upcoming: readonly HomeAudit[];
  payments: readonly HomePayment[];
  onOpen?: (audit: HomeAudit) => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: color.bone }}>
      <ScrollView
        contentContainerStyle={{
          padding: space.md,
          paddingTop: 68,
          gap: space.lg,
          paddingBottom: 40,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ ...text('display'), fontSize: 24, color: color.ink }}
        >
          Today
        </Text>

        {/* 1 — the largest thing on the screen, because it is why the app was opened. */}
        {next ? (
          <View
            style={{
              backgroundColor: color.paper,
              borderRadius: radius.tile,
              padding: space.md,
              gap: 6,
            }}
          >
            <Text style={{ ...text('caption'), color: color.muted }}>NEXT AUDIT</Text>
            <Text style={{ ...text('title'), color: color.ink }}>{next.title}</Text>
            <Text style={{ ...text('body'), color: color.bodyBrown }}>{next.dateLabel}</Text>
            {next.windowLabel ? (
              <Text style={{ ...text('body'), color: color.bodyBrown }}>{next.windowLabel}</Text>
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
                <Text style={{ ...text('body'), color: color.bone }}>{next.action}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Text style={{ ...text('body'), color: color.muted }}>
            Nothing booked in. Anything you accept from Offers shows up here.
          </Text>
        )}

        {/* 2 — enough per row to plan a week around. */}
        {upcoming.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={{ ...text('caption'), color: color.muted }}>COMING UP</Text>
            {upcoming.map((audit) => (
              <Pressable
                key={audit.id}
                accessibilityRole="button"
                accessibilityLabel={`${audit.title}, ${audit.dateLabel}`}
                onPress={onOpen ? () => onOpen(audit) : undefined}
                style={{
                  backgroundColor: color.paper,
                  borderRadius: radius.tile,
                  padding: space.md,
                  minHeight: touchTarget.comfortable,
                  gap: 2,
                }}
              >
                <Text style={{ ...text('body'), color: color.ink }}>{audit.title}</Text>
                <Text style={{ ...text('caption'), color: color.muted }}>
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
            <Text style={{ ...text('caption'), color: color.muted }}>SUBMITTED</Text>
            {payments.map((payment) => (
              <View
                key={payment.auditId}
                style={{
                  backgroundColor: color.paper,
                  borderRadius: radius.tile,
                  padding: space.md,
                  gap: 4,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <Text style={{ ...text('body'), color: color.ink, flex: 1 }}>
                    {payment.title}
                  </Text>
                  <Text style={{ ...text('body'), color: color.ink }}>
                    {formatMoney(payment.amountMinorUnits, 'GBP')}
                  </Text>
                </View>
                {/*
                  The state is a sentence, never a colour alone — this is read
                  outdoors in daylight, and "paid" and "held" must not depend on
                  telling two chips apart.
                */}
                <Text style={{ ...text('caption'), color: color.muted }}>
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
