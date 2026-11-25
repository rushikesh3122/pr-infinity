import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chips, ErrorView, LoadingView, Screen, SectionHeader, StatusBadge } from '../../components/ui';
import { useInvoice, useSetPaymentStatus } from '../../hooks/queries';
import { useToast } from '../../providers/ToastProvider';
import { useConfirm } from '../../providers/DialogProvider';
import { getErrorMessage } from '../../api/client';
import { InvoiceWebView } from '../../features/invoices/InvoiceWebView';
import { getInvoicePdf, invoiceHtml, openPdf, printHtml, savePdfToDevice, sharePdf } from '../../features/invoices/pdfService';
import { colors, radius, spacing, typography } from '../../theme';
import { formatCurrency, formatDateLong, formatMobile } from '../../utils/format';
import type { PaymentStatus } from '../../types/models';

type Action = 'open' | 'share' | 'save' | 'print';

export default function InvoiceDetailScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { data: invoice, isLoading, error, refetch } = useInvoice(id);
  const setPayment = useSetPaymentStatus();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<Action | null>(null);

  const html = useMemo(() => (invoice ? invoiceHtml(invoice) : ''), [invoice]);

  // Right after generation, create the PDF in the background so it is ready and backed up on the server.
  useEffect(() => {
    if (fresh && invoice && Platform.OS !== 'web') void getInvoicePdf(invoice).catch(() => undefined);
  }, [fresh, invoice]);

  if (isLoading) return <LoadingView label="Loading invoice…" />;
  if (error || !invoice) return <ErrorView message={getErrorMessage(error)} onRetry={refetch} />;

  const run = async (action: Action) => {
    if (busy) return;
    setBusy(action);
    try {
      if (action === 'print') {
        await printHtml(html);
        return;
      }
      if (Platform.OS === 'web') {
        // Browsers save to PDF from the print dialog.
        await printHtml(html);
        return;
      }
      const file = await getInvoicePdf(invoice);
      if (action === 'open') await openPdf(file, invoice.invoiceNumber);
      if (action === 'share') await sharePdf(file, `Invoice ${invoice.invoiceNumber}`);
      if (action === 'save' && (await savePdfToDevice(file, invoice.invoiceNumber))) toast.success('PDF saved to your device');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const changePayment = async (status: PaymentStatus) => {
    if (status === invoice.paymentStatus) return;
    const ok = await confirm({
      title: `Mark as ${status}?`,
      message: 'Only the payment status changes. All billing details on this invoice stay as issued.',
      confirmText: `Mark ${status}`,
      tone: status === 'Paid' ? 'success' : 'default',
      icon: 'cash-outline',
    });
    if (!ok) return;
    try {
      await setPayment.mutateAsync({ id, paymentStatus: status });
      toast.success(`Payment status set to ${status}`);
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const { taxDetails: tax } = invoice;

  return (
    <Screen>
      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.flex}>
            <Text style={styles.heroCaption}>{tax.gstRate > 0 ? 'Tax invoice' : 'Non GST invoice'}</Text>
            <Text style={styles.heroNumber}>{invoice.invoiceNumber}</Text>
            <Text style={styles.heroCaption}>{formatDateLong(invoice.invoiceDate)}</Text>
          </View>
          <StatusBadge status={invoice.paymentStatus} size="lg" />
        </View>
        <View style={styles.heroBottom}>
          <View style={styles.flex}>
            <Text style={styles.heroCaption}>Billed to</Text>
            <Text style={styles.heroName}>{invoice.customerDetails.name}</Text>
            <Text style={styles.heroCaption}>{formatMobile(invoice.customerDetails.mobileNumber)}</Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.heroCaption}>Grand total</Text>
            <Text style={styles.heroTotal}>{formatCurrency(invoice.grandTotal)}</Text>
          </View>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button title="Share" icon="logo-whatsapp" variant="success" onPress={() => run('share')} loading={busy === 'share'} disabled={!!busy && busy !== 'share'} style={styles.flex} />
        <Button title="Open PDF" icon="document-outline" onPress={() => run('open')} loading={busy === 'open'} disabled={!!busy && busy !== 'open'} style={styles.flex} />
      </View>
      <View style={styles.actions}>
        <Button title="Download" icon="download-outline" variant="outline" onPress={() => run('save')} loading={busy === 'save'} disabled={!!busy && busy !== 'save'} style={styles.flex} />
        <Button title="Print" icon="print-outline" variant="outline" onPress={() => run('print')} loading={busy === 'print'} disabled={!!busy && busy !== 'print'} style={styles.flex} />
      </View>

      <SectionHeader title="Payment status" />
      <Card>
        <Chips<PaymentStatus>
          value={invoice.paymentStatus}
          onChange={changePayment}
          options={[
            { value: 'Unpaid', label: 'Unpaid', color: colors.danger },
            { value: 'Partially Paid', label: 'Partially Paid', color: colors.pending },
            { value: 'Paid', label: 'Paid', color: colors.success },
          ]}
        />
      </Card>

      <SectionHeader title="Invoice preview" />
      <View style={styles.preview}>
        <InvoiceWebView html={html} />
      </View>

      <SectionHeader title="Amounts" />
      <Card style={styles.amounts}>
        {invoice.items.map((item, i) => (
          <View key={i} style={styles.itemRow}>
            <View style={styles.flex}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.caption}>{item.quantity} × {formatCurrency(item.rate)}{item.warranty ? ` • ${item.warranty} warranty` : ''}</Text>
            </View>
            <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <Row label="Subtotal" value={formatCurrency(invoice.subtotal)} />
        {invoice.discount > 0 ? <Row label="Discount" value={`- ${formatCurrency(invoice.discount)}`} /> : null}
        {tax.totalTax > 0 ? <Row label={`${tax.taxType === 'IGST' ? 'IGST' : 'CGST + SGST'} (${tax.gstRate}%)`} value={formatCurrency(tax.totalTax)} /> : null}
        <Row label="Grand total" value={formatCurrency(invoice.grandTotal)} bold />
        <Text style={styles.words}>{invoice.amountInWords}</Text>
        {invoice.notes ? (
          <View style={styles.notes}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
            <Text style={styles.caption}>Internal note: {invoice.notes}</Text>
          </View>
        ) : null}
      </Card>

      <Button title="View customer & other invoices" icon="person-outline" variant="ghost" onPress={() => router.push(`/leads/${invoice.leadId}`)} style={styles.link} />
    </Screen>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { backgroundColor: colors.primary, borderColor: colors.primary },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  heroCaption: { color: '#B9C4DE', fontSize: 12, fontWeight: '600' },
  heroNumber: { color: '#fff', fontSize: 20, fontWeight: '800', marginVertical: 2 },
  heroBottom: { flexDirection: 'row', marginTop: spacing.xl, alignItems: 'flex-end' },
  heroName: { color: '#fff', fontSize: 16, fontWeight: '700', marginVertical: 2 },
  right: { alignItems: 'flex-end' },
  heroTotal: { color: colors.accent, fontSize: 24, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  preview: { height: 520, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  amounts: { gap: spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemName: { ...typography.subheading },
  itemAmount: { ...typography.subheading },
  caption: { ...typography.caption },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { ...typography.bodySmall },
  rowValue: { ...typography.body },
  bold: { fontWeight: '800', color: colors.text, fontSize: 16 },
  words: { ...typography.caption, fontStyle: 'italic' },
  notes: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: spacing.sm },
  link: { marginTop: spacing.lg },
});
