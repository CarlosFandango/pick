import { color, touchTarget } from '@picksel/tokens';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { text } from '@/theme';

/**
 * The three places an auditor lives.
 *
 * There was no navigation at all: `headerShown: false` and no tabs, so an
 * auditor landed on Offers, tapped into one, and was stranded — My Audits and
 * Earnings were unreachable except by accepting something (TND-88).
 *
 * Labels, not icons alone. An icon set for "offers" and "my audits" would be
 * two clipboards, and this is read at arm's length in daylight by someone who
 * is watching something they cannot pause.
 *
 * Which of these is *home* is still an open product question — see TND-95.
 * Offers stays the landing tab for now because an auditor with no work needs
 * it, and changing that unilaterally would change what the app is for.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: color.fieldSheet,
          borderTopColor: color.fieldDim,
          height: touchTarget.comfortable + 26,
          paddingTop: 6,
        },
        tabBarActiveTintColor: color.onDark,
        tabBarInactiveTintColor: color.fieldMuted,
        tabBarLabel: () => null,
      }}
    >
      <Tabs.Screen name="offers" options={{ title: 'Offers', tabBarIcon: label('Offers') }} />
      <Tabs.Screen name="audits" options={{ title: 'My audits', tabBarIcon: label('My audits') }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: label('Earnings') }} />
    </Tabs>
  );
}

/**
 * The tab's whole target is this label.
 *
 * Rendered through `tabBarIcon` rather than `tabBarLabel` so it gets the full
 * height of the bar — `touchTarget.comfortable` is the floor for anything an
 * auditor taps one-handed, outdoors.
 */
function label(caption: string) {
  return ({ color: tint }: { color: string }) => (
    <Text
      style={{
        ...text('caption'),
        color: tint,
        letterSpacing: 1,
        textAlign: 'center',
        minWidth: 78,
        lineHeight: touchTarget.comfortable,
      }}
    >
      {caption.toUpperCase()}
    </Text>
  );
}
