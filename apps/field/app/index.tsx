import { fontSize, fontWeight, space } from '@picksel/tokens';
import { Text, View } from 'react-native';
import { useTheme } from '@/theme';

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
      <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text }}>
        PICKsel Field
      </Text>
      <Text style={{ fontSize: fontSize.md, color: colors.textMuted }}>
        Scaffold. No features yet.
      </Text>
    </View>
  );
}
