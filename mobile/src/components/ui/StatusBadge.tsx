import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme';
import type { LeadStatus, PaymentStatus } from '../../types/models';

const LEAD: Record<LeadStatus, { fg: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Pending: { fg: colors.pending, bg: colors.pendingBg, icon: 'time' },
  'Deal Done': { fg: colors.success, bg: colors.successBg, icon: 'checkmark-circle' },
};

const PAYMENT: Record<PaymentStatus, { fg: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Paid: { fg: colors.success, bg: colors.successBg, icon: 'checkmark-circle' },
  'Partially Paid': { fg: colors.pending, bg: colors.pendingBg, icon: 'pie-chart' },
  Unpaid: { fg: colors.danger, bg: colors.dangerBg, icon: 'alert-circle' },
};

export function StatusBadge({ status, size = 'sm' }: { status: LeadStatus | PaymentStatus; size?: 'sm' | 'lg' }) {
  const s = (LEAD as Record<string, (typeof LEAD)[LeadStatus]>)[status] ?? PAYMENT[status as PaymentStatus];
  return (
    <View style={[styles.badge, size === 'lg' && styles.lg, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon} size={size === 'lg' ? 16 : 12} color={s.fg} />
      <Text style={[styles.text, size === 'lg' && styles.textLg, { color: s.fg }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  lg: { paddingHorizontal: spacing.md, paddingVertical: 6 },
  text: { fontSize: 11, fontWeight: '700' },
  textLg: { fontSize: 14 },
});
