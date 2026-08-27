import {
  formatMoney,
  type OfferListItem,
  type OfferState,
  offerState,
  offerTotalMinorUnits,
  sortOffers,
  timeLeftLabel,
  upliftLabel,
} from '@picksel/core';
import { color, fontSize, radius, space, touchTarget } from '@picksel/tokens';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { text } from '@/theme';

const CHIP: Record<OfferState, { label: string; fill?: string; ink?: string; rule: string }> = {
  new: { label: 'NEW', fill: color.teal, ink: color.bone, rule: color.teal },
  expiring: {
    label: 'EXPIRING',
    fill: color.auditing,
    ink: color.auditingInk,
    rule: color.auditing,
  },
  filled: { label: 'FILLED', rule: color.oat },
  gone: { label: 'GONE', rule: color.oat },
};

/** S2.1 — offers. Three states: new, expiring, accepted elsewhere. */
export function OffersScreen({
  offers,
  now,
  whoAndArea,
  onView,
}: {
  offers: OfferListItem[];
  now: Date;
  whoAndArea: string;
  onView: (offer: OfferListItem) => void;
}) {
  const visible = sortOffers(offers, now);

  return (
    <View style={{ flex: 1, backgroundColor: color.bone, padding: space.md, paddingTop: 68 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text
          accessibilityRole="header"
          style={{ ...text('display', fontSize.xl), color: color.ink }}
        >
          Offers
        </Text>
        <Text
          style={{ ...text('caption'), color: color.muted, marginLeft: 'auto', letterSpacing: 1.2 }}
        >
          {whoAndArea.toUpperCase()}
        </Text>
      </View>

      <ScrollView style={{ marginTop: space.md }} contentContainerStyle={{ gap: 10 }}>
        {visible.length === 0 ? (
          <Text style={{ ...text('body'), color: color.muted }}>
            No offers right now. We will let you know.
          </Text>
        ) : null}

        {visible.map((offer) => {
          const state = offerState(offer, now);
          const chip = CHIP[state];
          const filled = state === 'filled';

          return (
            <View
              key={offer.id}
              accessibilityLabel={`${offer.auditTypeLabel} ${offer.areaLabel} ${chip.label}`}
              style={{
                backgroundColor: filled ? color.bone : color.paper,
                borderWidth: 1,
                borderColor: color.oat,
                borderTopWidth: filled ? 1 : 5,
                borderTopColor: chip.rule,
                borderRadius: radius.tile,
                padding: space.md,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    backgroundColor: chip.fill ?? 'transparent',
                    borderWidth: chip.fill ? 0 : 1,
                    borderColor: color.oat,
                    borderRadius: radius.pill,
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                  }}
                >
                  <Text style={{ ...text('caption', fontSize.xs), color: chip.ink ?? color.muted }}>
                    {chip.label}
                  </Text>
                </View>
                {!filled ? (
                  <Text
                    style={{
                      ...text('caption'),
                      marginLeft: 'auto',
                      color: state === 'expiring' ? color.auditingText : color.muted,
                    }}
                  >
                    {timeLeftLabel(offer, now)}
                  </Text>
                ) : null}
              </View>

              <Text
                style={{
                  ...text('title'),
                  fontSize: filled ? 16 : 19,
                  color: filled ? color.muted : color.ink,
                  marginTop: 10,
                }}
              >
                {offer.auditTypeLabel} · {offer.areaLabel}
              </Text>

              {filled ? (
                <Text style={{ ...text('body', fontSize.xs), color: color.muted, marginTop: 3 }}>
                  Accepted by another auditor. No action needed.
                </Text>
              ) : (
                <>
                  <Text
                    style={{ ...text('body', fontSize.sm), color: color.bodyBrown, marginTop: 3 }}
                  >
                    {offer.windowLabel} · {offer.paymentMethodLabel}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                    <Text style={{ ...text('display', fontSize.lg), color: color.ink }}>
                      {formatMoney(offerTotalMinorUnits(offer))}
                    </Text>
                    <Text
                      style={{ ...text('body', fontSize.xs), color: color.muted, marginLeft: 8 }}
                    >
                      {upliftLabel(offer)}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View ${offer.auditTypeLabel} in ${offer.areaLabel}`}
                      onPress={() => onView(offer)}
                      style={{
                        marginLeft: 'auto',
                        backgroundColor: color.teal,
                        borderRadius: radius.pill,
                        paddingVertical: 11,
                        paddingHorizontal: 20,
                        minHeight: touchTarget.minimum,
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ ...text('body'), fontWeight: '700', color: color.bone }}>
                        View →
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
