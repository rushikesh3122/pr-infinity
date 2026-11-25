import { Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ErrorView, InfoRow, LoadingView, Screen, SectionHeader, StatusBadge } from '../../../components/ui';
import { InvoiceCard } from '../../../features/invoices/InvoiceCard';
import { useDeleteLead, useInvoiceList, useLead, useSetLeadStatus } from '../../../hooks/queries';
import { useConfirm } from '../../../providers/DialogProvider';
import { useToast } from '../../../providers/ToastProvider';
import { getErrorMessage } from '../../../api/client';
import { goBack } from '../../../utils/navigation';
import { colors, radius, spacing, typography } from '../../../theme';
import { formatDateLong, formatDateTime, formatMobile } from '../../../utils/format';

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: lead, isLoading, error, refetch, isRefetching } = useLead(id);
  const invoices = useInvoiceList({ leadId: id }, !!lead && lead.status === 'Deal Done');
  const setStatus = useSetLeadStatus();
  const remove = useDeleteLead();
  const confirm = useConfirm();
  const toast = useToast();

  if (isLoading) return <LoadingView />;
  if (error || !lead) return <ErrorView message={getErrorMessage(error)} onRetry={refetch} />;

  const done = lead.status === 'Deal Done';
  const invoiceItems = invoices.data?.pages.flatMap((p) => p.items) ?? [];

  const markDone = async () => {
    const ok = await confirm({
      title: 'Mark as Deal Done?',
      message: `Confirm that the deal with ${lead.customerName} is complete. You can then generate an invoice.`,
      confirmText: 'Yes, Deal Done',
      tone: 'success',
      icon: 'checkmark-done-circle-outline',
    });
    if (!ok) return;
    try {
      await setStatus.mutateAsync({ id, status: 'Deal Done' });
      toast.success('Deal marked as done');
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const markPending = async () => {
    const ok = await confirm({ title: 'Move back to Pending?', message: 'Use this if the deal was marked done by mistake.', confirmText: 'Move to Pending', icon: 'time-outline' });
    if (!ok) return;
    try {
      await setStatus.mutateAsync({ id, status: 'Pending' });
      toast.success('Lead moved to Pending');
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const deleteLead = async () => {
    const ok = await confirm({
      title: 'Delete this lead?',
      message: lead.invoiceCount
        ? `${lead.customerName} will be removed. Their ${lead.invoiceCount} invoice(s) are kept in Invoices for your records.`
        : `${lead.customerName} will be permanently removed.`,
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(id);
      toast.success('Lead deleted');
      goBack('/leads');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const whatsapp = () => Linking.openURL(`https://wa.me/91${lead.mobileNumber}`).catch(() => toast.error('WhatsApp is not available'));

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push(`/leads/${id}/edit`)} hitSlop={10} accessibilityLabel="Edit lead">
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <Screen
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.primary} />}
        footer={
          done ? (
            <Button title="Generate Invoice" icon="document-text-outline" variant="accent" onPress={() => router.push({ pathname: '/invoices/new', params: { leadId: id } })} />
          ) : (
            <Button title="Mark as Deal Done" icon="checkmark-done" variant="success" onPress={markDone} loading={setStatus.isPending} />
          )
        }
      >
        <Card>
          <View style={styles.headRow}>
            <Text style={styles.name}>{lead.customerName}</Text>
            <StatusBadge status={lead.status} size="lg" />
          </View>
          {done ? (
            <View style={styles.doneBanner}>
              <Ionicons name="trophy" size={18} color={colors.success} />
              <Text style={styles.doneText}>Deal completed on {formatDateTime(lead.dealCompletedAt)}</Text>
            </View>
          ) : (
            <View style={styles.pendingBanner}>
              <Ionicons name="time" size={18} color={colors.pending} />
              <Text style={styles.pendingText}>Waiting for the deal to close</Text>
            </View>
          )}
          <View style={styles.quick}>
            <Button title="Call" icon="call" size="sm" variant="secondary" style={styles.flex} onPress={() => Linking.openURL(`tel:${lead.mobileNumber}`)} />
            <Button title="WhatsApp" icon="logo-whatsapp" size="sm" variant="secondary" style={styles.flex} onPress={whatsapp} />
            {lead.email ? <Button title="Email" icon="mail" size="sm" variant="secondary" style={styles.flex} onPress={() => Linking.openURL(`mailto:${lead.email}`)} /> : null}
          </View>
        </Card>

        <Card style={styles.gap}>
          <InfoRow icon="call-outline" label="Mobile number" value={formatMobile(lead.mobileNumber)} />
          <InfoRow icon="location-outline" label="Address" value={lead.address} />
          <InfoRow icon="mail-outline" label="Email" value={lead.email} />
          <InfoRow icon="calendar-outline" label="Lead date" value={formatDateLong(lead.leadDate)} />
          <InfoRow icon="document-outline" label="Description / notes" value={lead.description} />
        </Card>

        {done ? (
          <>
            <SectionHeader title={`Invoices (${invoices.data?.pages[0]?.total ?? 0})`} />
            {invoiceItems.length ? (
              invoiceItems.map((inv) => <InvoiceCard key={inv._id} invoice={inv} onPress={() => router.push(`/invoices/${inv._id}`)} />)
            ) : (
              <Card>
                <Text style={styles.muted}>{invoices.isLoading ? 'Loading invoices…' : 'No invoices yet. Tap Generate Invoice below.'}</Text>
              </Card>
            )}
          </>
        ) : null}

        <SectionHeader title="Manage" />
        <Card style={styles.manage}>
          <Button title="Edit lead" icon="create-outline" variant="outline" onPress={() => router.push(`/leads/${id}/edit`)} />
          {done && !lead.invoiceCount ? <Button title="Move back to Pending" icon="arrow-undo-outline" variant="outline" onPress={markPending} /> : null}
          <Button title="Delete lead" icon="trash-outline" variant="dangerOutline" onPress={deleteLead} loading={remove.isPending} />
        </Card>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { marginTop: spacing.lg },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  name: { ...typography.title, flex: 1, fontSize: 22 },
  doneBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.successBg, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.lg },
  doneText: { color: colors.success, fontWeight: '700', fontSize: 13, flex: 1 },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.pendingBg, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.lg },
  pendingText: { color: '#8a5200', fontWeight: '600', fontSize: 13 },
  quick: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  muted: { ...typography.bodySmall },
  manage: { gap: spacing.sm },
});
