import { space } from '@picksel/tokens';
import { Text, View } from 'react-native';
import { text, useTheme } from '@/theme';

export default function Index() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.sm,
        backgroundColor: colors.background,
      }}
    >
      <Text style={{ ...text('title'), color: colors.text }}>PICKsel</Text>
      <Text style={{ ...text('body'), color: colors.textMuted }}>Scaffold. No features yet.</Text>
    </View>
  );
}
