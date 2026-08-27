import { color, fontSize, radius, space } from '@picksel/tokens';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { type PayLine, payBreakdown, poundsFromPence, totalPence } from '@/format/money';
import { expiresIn, offerArea, windowLabel } from '@/format/offer';
import { text } from '@/theme';

export interface OfferView {
  auditTypeLabel: string;
  paymentMethodLabel: string;
  postcodeOutward: string;
  locality?: string | null;
  windowStart: Date;
  windowEnd: Date;
  expiresAt: Date;
  pay: PayLine[];
}

/**
 * S1.3 — the job offer.
 *
 * Presentational on purpose: it takes a plain view object and two callbacks,
 * so it can be rendered in a test without a database, a session or a router.
 * The screen that wraps it does the fetching.
 */
export function OfferScreen({
  offer,
  now = new Date(),
  onAccept,
  onDecline,
  busy = false,
}: {
  offer: OfferView;
  now?: Date;
  onAccept: () => void;
  onDecline: () => void;
  busy?: boolean;
}) {
  const total = totalPence(offer.pay);

  return (
    <View style={{ flex: 1, backgroundColor: color.bone, padding: space.md, paddingTop: 68 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Text style={{ ...text('caption'), color: color.muted, letterSpacing: 1.4 }}>
          NEW OFFER · {expiresIn(offer.expiresAt, now)}
        </Text>

        <Text
          accessibilityRole="header"
          style={{
            ...text('display', fontSize.xl),
            color: color.ink,
            marginTop: space.sm,
          }}
        >
          {offer.auditTypeLabel}
        </Text>

        <View style={{ flexDirection: 'row', gap: space.xs, marginTop: space.sm }}>
          <Chip label={offer.paymentMethodLabel} fill={color.auditing} ink={color.auditingInk} />
          <Chip label={offer.auditTypeLabel} />
        </View>

        <View
          style={{
            marginTop: space.lg,
            backgroundColor: color.paper,
            borderWidth: 1,
            borderColor: color.oat,
            borderRadius: radius.tile,
            padding: space.md,
            gap: space.sm,
          }}
        >
          <Fact
            label="Area"
            value={offerArea(offer.postcodeOutward, offer.locality)}
            hint="Exact pitch shared after accepting"
          />
          <View style={{ borderTopWidth: 1, borderTopColor: color.oat, paddingTop: space.sm }}>
            <Fact
              label="Date window"
              value={windowLabel(offer.windowStart, offer.windowEnd)}
              hint="Any one shift in the window"
            />
          </View>
        </View>

        <View
          style={{
            marginTop: space.sm,
            backgroundColor: color.navy,
            borderRadius: radius.tile,
            padding: space.md,
          }}
        >
          <Text style={{ ...text('caption'), color: color.onDarkMuted, letterSpacing: 1.4 }}>
            TOTAL PAY
          </Text>
          <Text
            accessibilityLabel={`Total pay ${poundsFromPence(total)}`}
            style={{
              ...text('display', fontSize.xxl),
              color: color.onDark,
              marginTop: 6,
            }}
          >
            {poundsFromPence(total)}
          </Text>
          <Text style={{ ...text('caption'), color: color.onDarkMuted, marginTop: 6 }}>
            {payBreakdown(offer.pay)}
          </Text>
          <Text style={{ ...text('caption'), color: color.onDarkMuted }}>
            Shown in full before you accept.
          </Text>
        </View>

        <View style={{ marginTop: 'auto', paddingTop: space.lg, gap: space.sm }}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onAccept}
            style={{
              backgroundColor: color.teal,
              borderRadius: radius.pill,
              paddingVertical: space.md,
              alignItems: 'center',
              opacity: busy ? 0.5 : 1,
            }}
          >
            <Text style={{ ...text('title', fontSize.md), color: color.bone }}>Accept offer</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onDecline}
            style={{ alignSelf: 'center', borderBottomWidth: 1.5, borderBottomColor: color.ink }}
          >
            <Text style={{ ...text('body'), fontWeight: '600', color: color.ink }}>
              Not this time
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Chip({ label, fill, ink }: { label: string; fill?: string; ink?: string }) {
  return (
    <View
      style={{
        backgroundColor: fill ?? 'transparent',
        borderWidth: fill ? 0 : 1,
        borderColor: color.oat,
        borderRadius: radius.pill,
        paddingVertical: 5,
        paddingHorizontal: 11,
      }}
    >
      <Text
        style={{
          ...text('caption', fontSize.xs),
          letterSpacing: 1,
          color: ink ?? color.bodyBrown,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View>
      <Text style={{ ...text('caption'), color: color.muted, letterSpacing: 1.2 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ ...text('title', fontSize.md), color: color.ink, marginTop: 3 }}>{value}</Text>
      <Text style={{ ...text('caption'), color: color.muted, marginTop: 2 }}>{hint}</Text>
    </View>
  );
}
