import { color, fontSize, radius, space, touchTarget } from '@picksel/tokens';
import { Pressable, Text, View } from 'react-native';
import { text } from '@/theme';

/**
 * Waiting, or failed.
 *
 * One component for both, because the difference matters to the auditor and
 * nothing else: on a street with no signal, "still loading" and "this did not
 * work, tap to try again" are the two things they need told apart.
 */
export function Loading({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: color.fieldBg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: space.lg,
        gap: space.md,
      }}
    >
      {error ? (
        <>
          <Text style={{ ...text('title'), color: color.onDark, textAlign: 'center' }}>
            Could not load that
          </Text>
          <Text style={{ ...text('body'), color: color.fieldMuted, textAlign: 'center' }}>
            You may be out of signal. Nothing you have recorded is lost.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={{
              borderRadius: radius.pill,
              borderWidth: 1.5,
              borderColor: color.fieldDim,
              paddingHorizontal: space.lg,
              minHeight: touchTarget.comfortable,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ ...text('title', fontSize.md), color: color.onDark }}>Try again</Text>
          </Pressable>
        </>
      ) : (
        <Text style={{ ...text('body'), color: color.fieldMuted }}>Loading…</Text>
      )}
    </View>
  );
}
