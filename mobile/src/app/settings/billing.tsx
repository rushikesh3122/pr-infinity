import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { goBack } from '../../utils/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Chips, ErrorView, FormField, LoadingView, Screen, SectionHeader } from '../../components/ui';
import { useSettings, useUpdateSettings } from '../../hooks/queries';
import { useToast } from '../../providers/ToastProvider';
import { getErrorMessage } from '../../api/client';
import { colors, spacing, typography } from '../../theme';
import type { TaxType } from '../../types/models';

const schema = z.object({
  prefix: z.string().trim().min(1, 'Prefix is required').max(12).regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers or -'),
  startNumber: z.string().trim().regex(/^\d+$/, 'Whole number only').refine((v) => Number(v) >= 1, 'Must be 1 or more'),
  defaultGstRate: z.string().trim().refine((v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 28, 'GST must be between 0 and 28%'),
  defaultWarranty: z.string().trim(),
});
type Values = z.infer<typeof schema>;

export default function BillingSettingsScreen() {
  const { data, isLoading, error, refetch } = useSettings();
  const update = useUpdateSettings();
  const toast = useToast();
  const [taxType, setTaxType] = useState<TaxType>('CGST_SGST');
  const { control, handleSubmit, reset, formState } = useForm<Values>({ resolver: zodResolver(schema) });
  const watched = useWatch({ control });

  useEffect(() => {
    if (!data) return;
    const i = data.invoice;
    reset({ prefix: i.prefix, startNumber: String(i.startNumber), defaultGstRate: String(i.defaultGstRate), defaultWarranty: i.defaultWarranty ?? '' });
    setTaxType(i.defaultTaxType);
  }, [data, reset]);

  if (isLoading) return <LoadingView />;
  if (error || !data) return <ErrorView message={getErrorMessage(error)} onRetry={refetch} />;

  const save = handleSubmit(async (v) => {
    try {
      await update.mutateAsync({
        invoice: { prefix: v.prefix.toUpperCase(), startNumber: Number(v.startNumber), defaultGstRate: Number(v.defaultGstRate), defaultTaxType: taxType, defaultWarranty: v.defaultWarranty },
      });
      toast.success('Invoice settings saved');
      goBack('/settings');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  });

  const fy = (() => {
    const d = new Date();
    const start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
  })();
  const example = `${(watched.prefix || 'PRI').toUpperCase()}/${fy}/${String(Number(watched.startNumber) || 1).padStart(4, '0')}`;

  return (
    <Screen footer={<Button title="Save" icon="checkmark" onPress={() => void save()} loading={formState.isSubmitting} />}>
      <SectionHeader title="Invoice numbering" />
      <Card>
        <FormField control={control} name="prefix" label="Invoice prefix" required autoCapitalize="characters" />
        <FormField
          control={control}
          name="startNumber"
          label="Start numbering from"
          numeric
          hint="Use this to continue from your existing invoices. Numbers already issued are never reused, and numbering restarts each financial year (April)."
        />
        <Text style={styles.example}>Format: {example}</Text>
      </Card>
      <SectionHeader title="Default tax" />
      <Card>
        <FormField control={control} name="defaultGstRate" label="Default GST %" numeric hint="0 = NON GST INVOICE. You can change it on each invoice." />
        <Text style={styles.label}>Default tax type</Text>
        <Chips<TaxType>
          value={taxType}
          onChange={setTaxType}
          options={[
            { value: 'CGST_SGST', label: 'CGST + SGST' },
            { value: 'IGST', label: 'IGST' },
          ]}
        />
      </Card>
      <SectionHeader title="Items" />
      <Card>
        <FormField control={control} name="defaultWarranty" label="Default warranty" placeholder="e.g. 3 months" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  example: { ...typography.subheading, color: colors.primary },
  label: { ...typography.label, marginBottom: spacing.sm },
});
