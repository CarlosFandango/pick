import { color, radius, space, touchTarget } from '@picksel/tokens';
import { Pressable, Text, View } from 'react-native';
import { text } from '@/theme';

/**
 * Waiting, or failed.
 *
 * One component for both, because the difference matters to the auditor and
 * nothing else: on a street with no signal, "still loading" and "this did not
 * work, tap to try again" are the two things they need told apart.
 *
 * It used to say "You may be out of signal", which is the likeliest cause and
 * not one this component can know. A query that failed for any other reason
 * got the same confident sentence, and an auditor with full bars was told the
 * app's problem was theirs (TND-104). The reassurance about recorded work is
 * kept, because that part is always true — the outbox is the row itself.
 *
 * `onHome` gives a way out. Without it the only control was "try the thing
 * that just failed", on a screen that renders full-bleed over the tab bar,
 * mid-shift, one-handed.
 */
export function Loading({
  error,
  onRetry,
  onHome,
}: {
  error: Error | null;
  onRetry: () => void;
  onHome?: () => void;
}) {
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
            Nothing you have recorded is lost.
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
            <Text style={{ ...text('title'), fontSize: 15, color: color.onDark }}>Try again</Text>
          </Pressable>

          {onHome ? (
            <Pressable
              accessibilityRole="button"
              onPress={onHome}
              style={{
                minHeight: touchTarget.comfortable,
                justifyContent: 'center',
                paddingHorizontal: space.md,
              }}
            >
              <Text style={{ ...text('body'), color: color.fieldMuted }}>Back to home</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <Text style={{ ...text('body'), color: color.fieldMuted }}>Loading…</Text>
      )}
    </View>
  );
}
