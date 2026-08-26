import { pickselDark, pickselLight } from '@picksel/tokens';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { AuthProvider, useAuth } from '@/lib/session';

/**
 * Sends an auditor to sign in, and only once we know they are not already.
 *
 * Waiting for `ready` is the whole point: reading the persisted session is
 * asynchronous, so acting on `session === null` before it resolves signs out a
 * signed-in auditor on every cold start.
 */
function AuthGate() {
  const { session, ready } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;

    const onSignIn = segments[0] === 'sign-in';
    if (!session && !onSignIn) router.replace('/sign-in');
    if (session && onSignIn) router.replace('/offers');
  }, [ready, session, segments, router]);

  return null;
}

export default function RootLayout() {
  const { colors } = useColorScheme() === 'dark' ? pickselDark : pickselLight;

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <AuthGate />
      {/*
        The flag sheet is deliberately NOT a route. It is rendered inline by
        the session screen, because it must appear on one tap with no
        navigation transition — an auditor raising a flag is mid-interaction
        and cannot wait for a screen to slide in.
      */}
      <Stack
        screenOptions={{
          // The default header titles each screen after its filename ("index").
          // Screens that need one set it explicitly.
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </AuthProvider>
  );
}
