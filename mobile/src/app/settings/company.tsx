import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { goBack } from '../../utils/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, ErrorView, FormField, ImagePickerField, LoadingView, Screen, SectionHeader } from '../../components/ui';
import { useSettings, useUpdateSettings } from '../../hooks/queries';
import { useToast } from '../../providers/ToastProvider';
import { getErrorMessage } from '../../api/client';
import { spacing, typography } from '../../theme';

const schema = z.object({
  name: z.string().trim().min(2, 'Company name is required'),
  subtitle: z.string().trim(),
  tagline: z.string().trim(),
  address: z.string().trim().min(5, 'Address is required'),
  mobile: z.string().trim().min(10, 'Mobile number is required'),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]),
  website: z.string().trim(),
  gstin: z.union([z.literal(''), z.string().trim().toUpperCase().regex(/^[0-9A-Z]{15}$/, 'GSTIN must be 15 letters/numbers')]),
  udyamNumber: z.string().trim(),
});
type Values = z.infer<typeof schema>;

export default function CompanySettingsScreen() {
  const { data, isLoading, error, refetch } = useSettings();
  const update = useUpdateSettings();
  const toast = useToast();
  const [logo, setLogo] = useState('');
  const [signature, setSignature] = useState('');
  const { control, handleSubmit, reset, formState } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!data) return;
    const c = data.company;
    reset({ name: c.name, subtitle: c.subtitle, tagline: c.tagline, address: c.address, mobile: c.mobile, email: c.email, website: c.website, gstin: c.gstin, udyamNumber: c.udyamNumber });
    setLogo(c.logo);
    setSignature(c.signature);
  }, [data, reset]);

  if (isLoading) return <LoadingView />;
  if (error || !data) return <ErrorView message={getErrorMessage(error)} onRetry={refetch} />;

  const save = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({ company: { ...values, logo, signature } });
      toast.success('Company profile saved');
      goBack('/settings');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  });

  return (
    <Screen footer={<Button title="Save" icon="checkmark" onPress={() => void save()} loading={formState.isSubmitting} />}>
      <Text style={styles.note}>These details print on every new invoice. Invoices already issued keep the details they were created with.</Text>
      <Card>
        <ImagePickerField label="Company logo" value={logo} onChange={setLogo} hint="Square images work best. Shown top-left on the invoice." keepTransparency />
        <FormField control={control} name="name" label="Company name" required />
        <FormField control={control} name="subtitle" label="Business line" placeholder="e.g. Laptop & IT Solutions" />
        <FormField control={control} name="tagline" label="Tagline" placeholder="e.g. Powerful Laptops, Honest Prices." />
      </Card>
      <SectionHeader title="Contact" />
      <Card>
        <FormField control={control} name="address" label="Address" required multiline />
        <FormField control={control} name="mobile" label="Mobile" required keyboardType="phone-pad" />
        <FormField control={control} name="email" label="Email" keyboardType="email-address" autoCapitalize="none" />
        <FormField control={control} name="website" label="Website" autoCapitalize="none" />
      </Card>
      <SectionHeader title="Registration" />
      <Card>
        <FormField control={control} name="gstin" label="GSTIN" autoCapitalize="characters" maxLength={15} hint="Optional. Leave empty if not registered." />
        <FormField control={control} name="udyamNumber" label="UDYAM registration" autoCapitalize="characters" />
      </Card>
      <SectionHeader title="Authorized signature" />
      <Card>
        <ImagePickerField label="Signature / company stamp" value={signature} onChange={setSignature} hint="Printed above “Authorized Signatory For”." keepTransparency />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { ...typography.bodySmall, marginBottom: spacing.lg, lineHeight: 19 },
});
