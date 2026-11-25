import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../../theme';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  color?: string;
}

/** Horizontal single-select chips, used for filters and choices like payment status. */
export function Chips<T extends string>({ options, value, onChange }: { options: ChipOption<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((o) => {
        const active = o.value === value;
        const tint = o.color ?? colors.primary;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.chip, active && { backgroundColor: tint, borderColor: tint }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.text, active && styles.activeText]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: 2 },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  text: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  activeText: { color: colors.textInverse },
});
