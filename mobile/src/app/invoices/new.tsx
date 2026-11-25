import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chips, DateField, ErrorView, FormField, LoadingView, Screen, SectionHeader } from '../../components/ui';
import { useCreateInvoice, useLead, useNextInvoiceNumber, useSettings } from '../../hooks/queries';
import { useToast } from '../../providers/ToastProvider';
import { getErrorMessage } from '../../api/client';
import { calculateInvoice } from '../../features/invoices/calculator';
import { invoiceFormSchema, type InvoiceFormValues, type InvoiceItemFormValues } from '../../features/invoices/invoiceFormSchema';
import { renderInvoiceHtml } from '../../features/invoices/invoiceTemplate';
import { InvoicePreviewModal } from '../../features/invoices/InvoicePreviewModal';
import { colors, radius, spacing, typography } from '../../theme';
import { formatCurrency } from '../../utils/format';
import type { PaymentStatus, TaxType } from '../../types/models';

const GST_PRESETS = ['0', '5', '12', '18', '28'];

const normalizeMobile = (v: string) => v.replace(/[\s()-]/g, '').slice(-10);

export default function NewInvoiceScreen() {
  const { leadId } = useLocalSearchParams<{ leadId: string }>();
  const lead = useLead(leadId);
  const settings = useSettings();
  const nextNumber = useNextInvoiceNumber();
  const create = useCreateInvoice();
  const toast = useToast();

  // One key per screen visit: double taps and retries can never create two invoices.
  const requestId = useRef(Crypto.randomUUID()).current;
  const [invoiceDate, setInvoiceDate] = useState(new Date());
  const [taxType, setTaxType] = useState<TaxType>('CGST_SGST');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Unpaid');
  const [previewOpen, setPreviewOpen] = useState(false);

  const blankItem = (): InvoiceItemFormValues => ({
    name: '',
    description: '',
    warranty: settings.data?.invoice.defaultWarranty ?? '',
    quantity: '1',
    rate: '',
  });

  const { control, handleSubmit, reset, getValues, setValue } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      billTo: { name: '', mobileNumber: '', address: '' },
      sameShipTo: true,
      shipTo: { name: '', mobileNumber: '', address: '' },
      items: [blankItem()],
      discount: '',
      gstRate: '0',
      notes: '',
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Auto-fill customer details from the lead and defaults from settings, once both have loaded.
  const initialised = useRef(false);
  useEffect(() => {
    if (initialised.current || !lead.data || !settings.data) return;
    initialised.current = true;
    const party = { name: lead.data.customerName, mobileNumber: lead.data.mobileNumber, address: lead.data.address };
    setTaxType(settings.data.invoice.defaultTaxType);
    reset({
      billTo: party,
      sameShipTo: true,
      shipTo: party,
      items: [{ name: '', description: '', warranty: settings.data.invoice.defaultWarranty ?? '', quantity: '1', rate: '' }],
      discount: '',
      gstRate: String(settings.data.invoice.defaultGstRate ?? 0),
      notes: '',
    });
  }, [lead.data, settings.data, reset]);

  const watched = useWatch({ control });
  const totals = useMemo(
    () =>
      calculateInvoice(
        (watched.items ?? []).map((i) => ({ name: i?.name ?? '', description: i?.description, warranty: i?.warranty, quantity: i?.quantity ?? 0, rate: i?.rate ?? 0 })),
        watched.discount ?? 0,
        watched.gstRate ?? 0,
        taxType,
      ),
    [watched, taxType],
  );

  if (lead.isLoading || settings.isLoading) return <LoadingView />;
  if (lead.error || !lead.data) return <ErrorView message={getErrorMessage(lead.error)} onRetry={lead.refetch} />;
  if (settings.error || !settings.data) return <ErrorView message={getErrorMessage(settings.error)} onRetry={settings.refetch} />;
  if (lead.data.status !== 'Deal Done') {
    return <ErrorView message="Invoices can only be generated after the lead is marked as Deal Done." />;
  }

  const buildParties = (v: InvoiceFormValues) => {
    const billTo = { name: v.billTo.name.trim(), mobileNumber: normalizeMobile(v.billTo.mobileNumber), address: v.billTo.address.trim(), email: lead.data?.email ?? '' };
    const shipTo = v.sameShipTo || !v.shipTo
      ? billTo
      : { name: v.shipTo.name.trim(), mobileNumber: normalizeMobile(v.shipTo.mobileNumber), address: v.shipTo.address.trim(), email: '' };
    return { billTo, shipTo };
  };

  const previewHtml = () => {
    const v = getValues();
    const { billTo, shipTo } = buildParties(v);
    return renderInvoiceHtml(
      {
        invoiceNumber: nextNumber.data?.invoiceNumber ?? '—',
        invoiceDate,
        customerDetails: billTo,
        shipTo,
        ...totals,
        paymentStatus,
        company: settings.data!.company,
      },
      { draft: true },
    );
  };

  const openPreview = handleSubmit(
    () => {
      if (totals.discountExceedsSubtotal) {
        toast.error('Discount cannot be more than the subtotal');
        return;
      }
      void nextNumber.refetch();
      setPreviewOpen(true);
    },
    () => toast.error('Please fix the highlighted fields'),
  );

  const generate = handleSubmit(async (v) => {
    if (create.isPending) return;
    const { billTo, shipTo } = buildParties(v);
    try {
      const invoice = await create.mutateAsync({
        leadId,
        clientRequestId: requestId,
        invoiceDate: invoiceDate.toISOString(),
        customerDetails: billTo,
        shipTo,
        items: v.items.map((i) => ({ name: i.name.trim(), description: i.description.trim(), warranty: i.warranty.trim(), quantity: Number(i.quantity), rate: Number(i.rate) })),
        discount: Number(v.discount || 0),
        gstRate: Number(v.gstRate || 0),
        taxType,
        paymentStatus,
        notes: v.notes.trim(),
      });
      setPreviewOpen(false);
      toast.success(`Invoice ${invoice.invoiceNumber} generated`);
      router.replace({ pathname: '/invoices/[id]', params: { id: invoice._id, fresh: '1' } });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  });

  const gst = watched.gstRate ?? '0';

  return (
    <>
      <Screen footer={<Button title="Preview Invoice" icon="eye-outline" onPress={() => void openPreview()} />}>
        <Card style={styles.numberCard}>
          <View>
            <Text style={styles.onNavy}>Invoice number</Text>
            <Text style={styles.number}>{nextNumber.data?.invoiceNumber ?? '…'}</Text>
            <Text style={styles.onNavy}>Assigned automatically when you generate</Text>
          </View>
          <Ionicons name="receipt" size={32} color={colors.accent} />
        </Card>

        <SectionHeader title="Invoice date" />
        <Card>
          <DateField label="Invoice date" value={invoiceDate} onChange={setInvoiceDate} />
        </Card>

        <SectionHeader title="Bill to" />
        <Card>
          <FormField control={control} name="billTo.name" label="Customer name" required icon="person-outline" />
          <FormField control={control} name="billTo.mobileNumber" label="Mobile number" required icon="call-outline" keyboardType="phone-pad" />
          <FormField control={control} name="billTo.address" label="Address" required icon="location-outline" multiline />
          <Text style={styles.hint}>Filled in from the lead. Changes here only affect this invoice.</Text>
        </Card>

        <SectionHeader title="Ship to" />
        <Card>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Same as Bill To</Text>
            <Switch
              value={watched.sameShipTo ?? true}
              onValueChange={(v) => {
                setValue('sameShipTo', v);
                if (!v) setValue('shipTo', { ...getValues('billTo') });
              }}
              trackColor={{ true: colors.primary, false: colors.borderStrong }}
              thumbColor="#fff"
            />
          </View>
          {watched.sameShipTo === false ? (
            <View style={styles.shipFields}>
              <FormField control={control} name="shipTo.name" label="Name" required icon="person-outline" />
              <FormField control={control} name="shipTo.mobileNumber" label="Mobile number" required icon="call-outline" keyboardType="phone-pad" />
              <FormField control={control} name="shipTo.address" label="Address" required icon="location-outline" multiline />
            </View>
          ) : null}
        </Card>

        <SectionHeader title={`Items (${fields.length})`} />
        {fields.map((field, index) => {
          const line = totals.items[index];
          return (
            <Card key={field.id} style={styles.itemCard}>
              <View style={styles.itemHead}>
                <Text style={styles.itemTitle}>Item {index + 1}</Text>
                {fields.length > 1 ? (
                  <Pressable onPress={() => remove(index)} hitSlop={10} accessibilityLabel={`Remove item ${index + 1}`}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
              <FormField control={control} name={`items.${index}.name`} label="Product / service" required placeholder="e.g. DELL LATITUDE 5420" />
              <FormField
                control={control}
                name={`items.${index}.description`}
                label="Specifications"
                placeholder={'One per line, e.g.\nIntel Core i5 | 11th Gen\n8GB RAM | 512GB SSD\nS/N:5CD123ABC'}
                multiline
              />
              <FormField control={control} name={`items.${index}.warranty`} label="Warranty" placeholder="e.g. 3 months" />
              <View style={styles.row}>
                <View style={styles.qty}>
                  <FormField control={control} name={`items.${index}.quantity`} label="Qty" required numeric />
                </View>
                <View style={styles.flex}>
                  <FormField control={control} name={`items.${index}.rate`} label="Rate (₹)" required numeric placeholder="0.00" />
                </View>
              </View>
              <View style={styles.amountRow}>
                <Text style={styles.caption}>Amount</Text>
                <Text style={styles.amount}>{formatCurrency(line?.amount ?? 0)}</Text>
              </View>
            </Card>
          );
        })}
        <Button title="Add another item" icon="add-circle-outline" variant="outline" onPress={() => append(blankItem())} />

        <SectionHeader title="Discount & tax" />
        <Card>
          <FormField control={control} name="discount" label="Discount (₹)" numeric placeholder="0.00 (optional)" />
          <Text style={styles.label}>GST rate</Text>
          <Chips
            value={GST_PRESETS.includes(gst) ? gst : 'custom'}
            onChange={(v) => {
              if (v !== 'custom') setValue('gstRate', v, { shouldValidate: true });
            }}
            options={[...GST_PRESETS.map((r) => ({ value: r, label: r === '0' ? 'No GST' : `${r}%` })), { value: 'custom', label: 'Custom' }]}
          />
          <View style={styles.gap}>
            <FormField control={control} name="gstRate" label="GST %" numeric hint="0% prints a NON GST INVOICE; any other rate prints a TAX INVOICE." />
          </View>
          {Number(gst) > 0 ? (
            <>
              <Text style={styles.label}>Tax type</Text>
              <Chips<TaxType>
                value={taxType}
                onChange={setTaxType}
                options={[
                  { value: 'CGST_SGST', label: 'CGST + SGST (same state)' },
                  { value: 'IGST', label: 'IGST (other state)' },
                ]}
              />
            </>
          ) : null}
        </Card>

        <SectionHeader title="Payment" />
        <Card>
          <Chips<PaymentStatus>
            value={paymentStatus}
            onChange={setPaymentStatus}
            options={[
              { value: 'Unpaid', label: 'Unpaid', color: colors.danger },
              { value: 'Partially Paid', label: 'Partially Paid', color: colors.pending },
              { value: 'Paid', label: 'Paid', color: colors.success },
            ]}
          />
          <View style={styles.gap}>
            <FormField control={control} name="notes" label="Internal notes" placeholder="Optional, not printed on the invoice" multiline />
          </View>
        </Card>

        <SectionHeader title="Summary" />
        <Card style={styles.summary}>
          <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
          {totals.discount > 0 ? <SummaryRow label="Discount" value={`- ${formatCurrency(totals.discount)}`} /> : null}
          {totals.discountExceedsSubtotal ? <Text style={styles.error}>Discount is more than the subtotal</Text> : null}
          <SummaryRow label="Taxable value" value={formatCurrency(totals.taxDetails.taxableValue)} />
          {taxType === 'IGST' ? (
            <SummaryRow label={`IGST (${totals.taxDetails.igstRate}%)`} value={formatCurrency(totals.taxDetails.igstAmount)} />
          ) : (
            <>
              <SummaryRow label={`CGST (${totals.taxDetails.cgstRate}%)`} value={formatCurrency(totals.taxDetails.cgstAmount)} />
              <SummaryRow label={`SGST (${totals.taxDetails.sgstRate}%)`} value={formatCurrency(totals.taxDetails.sgstAmount)} />
            </>
          )}
          <View style={styles.divider} />
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Grand Total</Text>
            <Text style={styles.grandValue}>{formatCurrency(totals.grandTotal)}</Text>
          </View>
          <Text style={styles.words}>{totals.amountInWords}</Text>
        </Card>
      </Screen>

      <InvoicePreviewModal
        visible={previewOpen}
        html={previewOpen ? previewHtml() : ''}
        onClose={() => setPreviewOpen(false)}
        onConfirm={() => void generate()}
        confirming={create.isPending}
      />
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { marginTop: spacing.lg },
  numberCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primary, borderColor: colors.primary },
  caption: { ...typography.caption },
  onNavy: { ...typography.caption, color: '#B9C4DE' },
  number: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 2 },
  hint: { ...typography.caption, marginTop: 2 },
  label: { ...typography.label, marginBottom: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { ...typography.subheading },
  shipFields: { marginTop: spacing.lg },
  itemCard: { marginBottom: spacing.md },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  itemTitle: { ...typography.subheading, color: colors.primary },
  row: { flexDirection: 'row', gap: spacing.md },
  qty: { width: 90 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, padding: spacing.md },
  amount: { ...typography.subheading, fontWeight: '800' },
  summary: { gap: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { ...typography.bodySmall },
  summaryValue: { ...typography.body, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  grandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandLabel: { ...typography.heading },
  grandValue: { ...typography.heading, color: colors.primary, fontSize: 22 },
  words: { ...typography.caption, fontStyle: 'italic' },
  error: { color: colors.danger, fontSize: 12 },
});
