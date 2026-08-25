import { pickselDark, pickselLight } from '@picksel/tokens';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const { colors } = useColorScheme() === 'dark' ? pickselDark : pickselLight;

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          // The default header titles each screen after its filename ("index").
          // Screens that need one will set it explicitly.
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}
