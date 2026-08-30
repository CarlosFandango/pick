import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/session';
import { surface } from '@/theme';

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
    // Home, not offers: signing in lands an auditor on their own work,
    // same as opening the app does (TND-95).
    if (session && onSignIn) router.replace('/home' as never);
  }, [ready, session, segments, router]);

  return null;
}

/** Headers match the field surface: this app is read on a street, at night. */
const darkHeader = {
  headerStyle: { backgroundColor: surface.sheet },
  headerTintColor: surface.title,
  headerShadowVisible: false,
} as const;

export default function RootLayout() {
  // The field app does not follow the device scheme. It is dark because an
  // auditor is running a mystery shop and a bright screen is conspicuous —
  // see `surface` for the whole argument. Following the OS would put half of
  // them on a white page in the one situation where that matters most.

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
          contentStyle: { backgroundColor: surface.ground },
        }}
      >
        {/*
          Detail screens get a header, and with it a back button. Without one
          an auditor who taps into an offer is stranded — which is exactly
          what shipped, and exactly TND-76 repeated on a second app.
        */}
        <Stack.Screen
          name="offer/[id]"
          options={{ headerShown: true, headerTitle: 'Offer', ...darkHeader }}
        />
        <Stack.Screen
          name="audit/[id]/prep"
          options={{ headerShown: true, headerTitle: 'Prep', ...darkHeader }}
        />
        <Stack.Screen
          name="audit/[id]/write-up"
          options={{ headerShown: true, headerTitle: 'Write-up', ...darkHeader }}
        />
        {/*
          The session gets NO back button on purpose. Leaving mid-shift loses
          the auditor's place while they are standing in front of the team
          they are observing, and there is no way back into a session that has
          already started.
        */}
        <Stack.Screen name="audit/[id]/session" options={{ gestureEnabled: false }} />
      </Stack>
    </AuthProvider>
  );
}
