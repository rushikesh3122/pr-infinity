import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState, ErrorView, Fab, LoadingView, Screen, SectionHeader } from '../../components/ui';
import { LeadCard } from '../../features/leads/LeadCard';
import { InvoiceCard } from '../../features/invoices/InvoiceCard';
import { useDashboard } from '../../hooks/queries';
import { useSettings } from '../../hooks/queries';
import { getErrorMessage } from '../../api/client';
import { colors, radius, spacing, typography } from '../../theme';
import { formatCurrency } from '../../utils/format';

type IconName = keyof typeof Ionicons.glyphMap;

function StatCard({ label, value, icon, tint, bg, onPress }: { label: string; value: number; icon: IconName; tint: string; bg: string; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function DashboardScreen() {
  const settings = useSettings();
  const { data, isLoading, error, refetch, isRefetching } = useDashboard();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  if (isLoading) return <LoadingView label="Loading dashboard…" />;
  if (error || !data) return <ErrorView message={getErrorMessage(error)} onRetry={refetch} />;

  const { stats } = data;
  const openLeads = (status?: string) => router.push({ pathname: '/leads', params: status ? { status } : {} });

  return (
    <View style={styles.flex}>
      <Screen refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.primary} />}>
        <View style={styles.hero}>
          <Text style={styles.heroHello}>{greeting()},</Text>
          <Text style={styles.heroName}>{settings.data?.company.name ?? 'PR Infinity'}</Text>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroLabel}>Total invoiced</Text>
              <Text style={styles.heroValue}>{formatCurrency(stats.totalInvoiced)}</Text>
            </View>
            <View style={styles.heroRight}>
              <Text style={styles.heroLabel}>Received (paid)</Text>
              <Text style={styles.heroValueSmall}>{formatCurrency(stats.totalPaid)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          <StatCard label="Total Leads" value={stats.totalLeads} icon="people" tint={colors.primary} bg={colors.primaryLight} onPress={() => openLeads()} />
          <StatCard label="Pending Leads" value={stats.pendingLeads} icon="time" tint={colors.pending} bg={colors.pendingBg} onPress={() => openLeads('Pending')} />
          <StatCard label="Deals Completed" value={stats.dealsDone} icon="checkmark-done-circle" tint={colors.success} bg={colors.successBg} onPress={() => openLeads('Deal Done')} />
          <StatCard label="Invoices Generated" value={stats.totalInvoices} icon="document-text" tint={colors.accent} bg={colors.accentLight} onPress={() => router.push('/invoices')} />
        </View>

        <SectionHeader title="Recently added leads" actionLabel="View all" onAction={() => openLeads()} />
        {data.recentLeads.length ? (
          data.recentLeads.map((l) => <LeadCard key={l._id} lead={l} compact onPress={() => router.push(`/leads/${l._id}`)} />)
        ) : (
          <Card>
            <EmptyState icon="person-add-outline" title="No leads yet" message="Tap + to add your first customer lead." />
          </Card>
        )}

        <SectionHeader title="Recently completed deals" actionLabel="View all" onAction={() => openLeads('Deal Done')} />
        {data.recentDeals.length ? (
          data.recentDeals.map((l) => <LeadCard key={l._id} lead={l} compact onPress={() => router.push(`/leads/${l._id}`)} />)
        ) : (
          <Card><Text style={styles.muted}>Deals you mark as done will appear here.</Text></Card>
        )}

        <SectionHeader title="Recently generated invoices" actionLabel="View all" onAction={() => router.push('/invoices')} />
        {data.recentInvoices.length ? (
          data.recentInvoices.map((i) => <InvoiceCard key={i._id} invoice={i} onPress={() => router.push(`/invoices/${i._id}`)} />)
        ) : (
          <Card><Text style={styles.muted}>Generate an invoice from any Deal Done lead.</Text></Card>
        )}
      </Screen>
      <Fab label="Add new lead" onPress={() => router.push('/leads/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.lg },
  heroHello: { color: '#B9C4DE', fontSize: 14 },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 2 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: spacing.xl },
  heroRight: { alignItems: 'flex-end' },
  heroLabel: { color: '#B9C4DE', fontSize: 12, fontWeight: '600' },
  heroValue: { color: colors.accent, fontSize: 26, fontWeight: '800', marginTop: 2 },
  heroValueSmall: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { width: '47.5%', flexGrow: 1, padding: spacing.lg },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  statValue: { ...typography.title, fontSize: 28 },
  statLabel: { ...typography.bodySmall, fontWeight: '600', marginTop: 2 },
  muted: { ...typography.bodySmall },
});
