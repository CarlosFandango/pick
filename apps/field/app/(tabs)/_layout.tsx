import Feather from '@expo/vector-icons/Feather';
import { color, touchTarget } from '@picksel/tokens';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { surface, text } from '@/theme';

/**
 * The three places an auditor lives.
 *
 * There was no navigation at all: `headerShown: false` and no tabs, so an
 * auditor landed on Offers, tapped into one, and was stranded — My Audits and
 * Earnings were unreachable except by accepting something (TND-88).
 *
 * Icons **and** labels, never either alone. The icon is what the eye finds at
 * arm's length in daylight; the label is what stops "offers" and "my audits"
 * — which are both, honestly, a clipboard — from being a guess. Dropping the
 * label to fit a fifth tab would make the bar prettier and less usable.
 *
 * Home is now the landing tab (TND-95): an auditor with a shift today opens
 * the app to check what is next, not to browse. Offers stays a tab, because an
 * auditor with nothing on still needs somewhere to look for work.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: surface.sheet,
          borderTopColor: surface.line,
          height: touchTarget.comfortable + 34,
          paddingTop: 6,
        },
        tabBarActiveTintColor: surface.title,
        tabBarInactiveTintColor: surface.muted,
        tabBarLabel: () => null,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: tab('home', 'Home') }} />
      <Tabs.Screen
        name="offers"
        options={{ title: 'Offers', tabBarIcon: tab('inbox', 'Offers') }}
      />
      <Tabs.Screen
        name="audits"
        options={{ title: 'My audits', tabBarIcon: tab('clipboard', 'Audits') }}
      />
      <Tabs.Screen
        name="earnings"
        options={{ title: 'Earnings', tabBarIcon: tab('credit-card', 'Earnings') }}
      />
    </Tabs>
  );
}

/**
 * Icon over label, and the pair is the tap target.
 *
 * Rendered through `tabBarIcon` rather than `tabBarLabel` so the whole stack
 * gets the bar's full height — `touchTarget.comfortable` is the floor for
 * anything an auditor taps one-handed, outdoors, while watching something they
 * cannot pause.
 */
function tab(icon: React.ComponentProps<typeof Feather>['name'], caption: string) {
  return ({ color: tint }: { color: string }) => (
    <View style={{ alignItems: 'center', justifyContent: 'center', minWidth: 78, gap: 3 }}>
      <Feather name={icon} size={20} color={tint} />
      {/*
        numberOfLines is the guard, not the fix: a caption that wraps pushes
        its icon up and out of the bar, and the tab stops lining up with the
        three beside it. Captions stay one short word so this never fires.
      */}
      <Text
        numberOfLines={1}
        style={{ ...text('caption'), color: tint, letterSpacing: 1, textAlign: 'center' }}
      >
        {caption.toUpperCase()}
      </Text>
    </View>
  );
}
