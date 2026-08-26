import { color, radius, space, touchTarget } from '@picksel/tokens';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { text } from '@/theme';

/**
 * Scaffolding, not a designed screen.
 *
 * There is no sign-in mockup until Phase 5 — Onboarding. This exists so an
 * auditor can reach their offers; replace it wholesale when S5 lands rather
 * than styling it now.
 */
export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const { error: failure } = await supabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    // Never echo which half was wrong — that tells an attacker which emails exist.
    if (failure) setError('Those details did not match an account.');
    // On success the auth listener redirects; nothing to do here.
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: color.fieldBg,
        padding: 24,
        justifyContent: 'center',
        gap: space.md,
      }}
    >
      <Text style={{ ...text('title'), color: color.onDark, letterSpacing: 2 }}>PICKSEL</Text>

      <TextInput
        accessibilityLabel="Email"
        placeholder="Email"
        placeholderTextColor={color.fieldMuted}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={field}
      />
      <TextInput
        accessibilityLabel="Password"
        placeholder="Password"
        placeholderTextColor={color.fieldMuted}
        autoCapitalize="none"
        autoComplete="current-password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={field}
      />

      {error ? <Text style={{ ...text('body'), color: color.creative }}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={submit}
        style={{
          backgroundColor: color.teal,
          borderRadius: radius.pill,
          minHeight: touchTarget.comfortable,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Text style={{ ...text('title'), fontSize: 15, color: color.onDark }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Text>
      </Pressable>
    </View>
  );
}

const field = {
  borderWidth: 1,
  borderColor: color.fieldDim,
  borderRadius: radius.tile,
  padding: space.md,
  color: color.onDark,
  minHeight: touchTarget.comfortable,
} as const;
