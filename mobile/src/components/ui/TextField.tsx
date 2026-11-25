import { forwardRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const TextField = forwardRef<React.ComponentRef<typeof TextInput>, TextFieldProps>(function TextField(
  { label, error, hint, required, icon, style, multiline, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.req}> *</Text> : null}
        </Text>
      ) : null}
      <View style={[styles.box, multiline && styles.multiBox, focused && styles.focused, !!error && styles.errorBox]}>
        {icon ? <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.textMuted} style={styles.icon} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.multiInput, style]}
          {...rest}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { ...typography.label, marginBottom: spacing.xs + 2 },
  req: { color: colors.danger },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  multiBox: { alignItems: 'flex-start', paddingVertical: spacing.sm },
  focused: { borderColor: colors.primary, borderWidth: 1.5 },
  errorBox: { borderColor: colors.danger },
  icon: { marginRight: spacing.sm },
  input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: spacing.sm, ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}) },
  multiInput: { minHeight: 84 },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.xs, fontWeight: '500' },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
});
