import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Card, ErrorView, LoadingView, Screen, SectionHeader } from '../../components/ui';
import { useSettings } from '../../hooks/queries';
import { getErrorMessage } from '../../api/client';
import { colors, spacing, typography } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

function Row({ icon, title, subtitle, onPress }: { icon: IconName; title: string; subtitle?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]} accessibilityRole="button">
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={19} color={colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { data, isLoading, error, refetch } = useSettings();

  if (isLoading) return <LoadingView />;
  if (error || !data) return <ErrorView message={getErrorMessage(error)} onRetry={() => void refetch()} />;
  const { company, invoice } = data;

  return (
    <Screen>
      <Card style={styles.profile}>
        {company.logo ? <Image source={{ uri: company.logo }} style={styles.logo} resizeMode="contain" /> : null}
        <View style={styles.flex}>
          <Text style={styles.company}>{company.name || 'Your company'}</Text>
          <Text style={styles.rowSub}>{company.subtitle}</Text>
          <Text style={styles.rowSub}>{company.gstin ? `GSTIN ${company.gstin}` : 'GSTIN not set'}</Text>
        </View>
      </Card>

      <SectionHeader title="Business" />
      <Card style={styles.group}>
        <Row icon="business-outline" title="Company profile" subtitle="Name, logo, address, contact, GSTIN, signature" onPress={() => router.push('/settings/company')} />
        <View style={styles.sep} />
        <Row icon="receipt-outline" title="Invoice & tax" subtitle={`Prefix ${invoice.prefix} • GST ${invoice.defaultGstRate}%`} onPress={() => router.push('/settings/billing')} />
        <View style={styles.sep} />
        <Row icon="card-outline" title="Bank details & terms" subtitle={company.bank?.bankName || 'Shown at the bottom of invoices'} onPress={() => router.push('/settings/bank')} />
      </Card>

      <SectionHeader title="Your data" />
      <Card style={styles.group}>
        <Row icon="cloud-upload-outline" title="Backup & restore" subtitle="Save a copy of all leads and invoices" onPress={() => router.push('/settings/backup')} />
      </Card>
      <View style={styles.note}>
        <Ionicons name="phone-portrait-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.noteText}>All data is stored on this phone and works without internet. Take a backup regularly.</Text>
      </View>

      <Text style={styles.footer}>PR Infinity v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  logo: { width: 64, height: 60, borderRadius: 8 },
  company: { ...typography.heading },
  group: { padding: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { ...typography.subheading },
  rowSub: { ...typography.caption, marginTop: 2 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 64 },
  note: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, paddingHorizontal: spacing.xs },
  noteText: { ...typography.caption, color: colors.textSecondary, flex: 1, lineHeight: 18 },
  footer: { ...typography.caption, textAlign: 'center', marginTop: spacing.xl },
});
