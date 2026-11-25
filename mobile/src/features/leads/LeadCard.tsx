import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, StatusBadge } from '../../components/ui';
import { colors, spacing, typography } from '../../theme';
import type { Lead } from '../../types/models';
import { formatDateLong, formatMobile, initials } from '../../utils/format';

export function LeadCard({ lead, onPress, compact }: { lead: Pick<Lead, 'customerName' | 'mobileNumber' | 'address' | 'status' | 'leadDate' | 'dealCompletedAt'>; onPress: () => void; compact?: boolean }) {
  const done = lead.status === 'Deal Done';
  return (
    <Card onPress={onPress} style={[styles.card, done && styles.doneEdge]}>
      <View style={styles.row}>
        <View style={[styles.avatar, done && { backgroundColor: colors.successBg }]}>
          <Text style={[styles.avatarText, done && { color: colors.success }]}>{initials(lead.customerName)}</Text>
        </View>
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>{lead.customerName}</Text>
            <StatusBadge status={lead.status} />
          </View>
          <View style={styles.meta}>
            <Ionicons name="call-outline" size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatMobile(lead.mobileNumber)}</Text>
            <Text style={styles.dot}>•</Text>
            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatDateLong(done && compact ? lead.dealCompletedAt : lead.leadDate)}</Text>
          </View>
          {!compact ? (
            <View style={styles.meta}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <Text style={[styles.metaText, styles.flex]} numberOfLines={1}>{lead.address}</Text>
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.pending },
  doneEdge: { borderLeftColor: colors.success },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.pendingBg, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '700', color: colors.pending, fontSize: 15 },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { ...typography.subheading, flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { ...typography.caption, color: colors.textSecondary },
  dot: { color: colors.textMuted, marginHorizontal: 2 },
});
