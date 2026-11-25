import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';

export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function InfoRow({ icon, label, value, children }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; children?: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.label}>{label}</Text>
        {children ?? <Text style={styles.value}>{value || '—'}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xxl, marginBottom: spacing.md },
  title: { ...typography.heading, fontSize: 17 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm + 2 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, justifyContent: 'center' },
  label: { ...typography.caption, marginBottom: 2 },
  value: { ...typography.body, lineHeight: 21 },
});
