import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'accent' | 'dangerOutline';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const PALETTE: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.textInverse },
  secondary: { bg: colors.surfaceMuted, fg: colors.primary },
  outline: { bg: 'transparent', fg: colors.primary, border: colors.borderStrong },
  ghost: { bg: 'transparent', fg: colors.primary },
  danger: { bg: colors.danger, fg: colors.textInverse },
  success: { bg: colors.success, fg: colors.textInverse },
  accent: { bg: colors.accent, fg: colors.textInverse },
  dangerOutline: { bg: 'transparent', fg: colors.danger, border: colors.dangerBg },
};

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, size = 'md', style, testID }: Props) {
  const p = PALETTE[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.sm,
        { backgroundColor: p.bg, borderColor: p.border ?? p.bg, borderWidth: p.border ? 1 : 0 },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={p.fg} size="small" />
        ) : icon ? (
          <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={p.fg} />
        ) : null}
        <Text style={[styles.text, size === 'sm' && styles.textSm, { color: p.fg }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 50, borderRadius: radius.md, paddingHorizontal: spacing.lg, justifyContent: 'center', alignItems: 'center' },
  sm: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { fontSize: 15, fontWeight: '700' },
  textSm: { fontSize: 13 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
});
