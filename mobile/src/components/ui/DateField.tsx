import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';
import { formatDateLong } from '../../utils/format';

export function DateField({ label, value, onChange, maximumDate }: { label: string; value: Date; onChange: (d: Date) => void; maximumDate?: Date }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.box} onPress={() => setOpen(true)} accessibilityRole="button">
        <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
        <Text style={styles.value}>{formatDateLong(value)}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>
      {open && Platform.OS !== 'web' ? (
        <DateTimePicker
          value={value}
          mode="date"
          maximumDate={maximumDate}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, date) => {
            setOpen(Platform.OS === 'ios');
            if (event.type === 'set' && date) onChange(date);
            if (event.type === 'dismissed') setOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { ...typography.label, marginBottom: spacing.xs + 2 },
  box: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  value: { flex: 1, fontSize: 15, color: colors.text },
});
