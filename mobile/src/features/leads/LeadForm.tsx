import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, DateField, FormField, Screen } from '../../components/ui';
import { colors, spacing, typography } from '../../theme';
import { getFieldErrors } from '../../api/client';
import { emptyLead, leadFormSchema, type LeadFormValues } from './leadSchema';

interface Props {
  defaultValues?: LeadFormValues;
  defaultDate?: Date;
  submitLabel: string;
  onSubmit: (values: LeadFormValues & { leadDate: string }) => Promise<unknown>;
  showStatusNote?: boolean;
}

export function LeadForm({ defaultValues = emptyLead, defaultDate, submitLabel, onSubmit, showStatusNote }: Props) {
  const [leadDate, setLeadDate] = useState(defaultDate ?? new Date());
  const { control, handleSubmit, setError, reset, formState } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues,
  });

  useEffect(() => reset(defaultValues), [defaultValues, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit({ ...values, leadDate: leadDate.toISOString() });
    } catch (err) {
      // Surface server-side validation next to the matching field.
      for (const [field, message] of Object.entries(getFieldErrors(err))) {
        if (field in emptyLead) setError(field as keyof LeadFormValues, { message });
      }
      throw err;
    }
  });

  return (
    <Screen footer={<Button title={submitLabel} icon="checkmark" onPress={() => submit().catch(() => undefined)} loading={formState.isSubmitting} />}>
      <Card>
        <Text style={styles.section}>Customer details</Text>
        <FormField control={control} name="customerName" label="Customer name" required icon="person-outline" placeholder="e.g. Sudhan Puranik" autoCapitalize="words" />
        <FormField control={control} name="mobileNumber" label="Mobile number" required icon="call-outline" placeholder="10-digit mobile number" keyboardType="phone-pad" maxLength={16} />
        <FormField control={control} name="address" label="Address" required icon="location-outline" placeholder="House, street, area, city, PIN" multiline />
        <FormField control={control} name="email" label="Email address" icon="mail-outline" placeholder="Optional" keyboardType="email-address" autoCapitalize="none" />
      </Card>
      <Card style={styles.gap}>
        <Text style={styles.section}>Lead information</Text>
        <DateField label="Lead date" value={leadDate} onChange={setLeadDate} maximumDate={new Date()} />
        <FormField control={control} name="description" label="Description / notes" placeholder="What is the customer looking for? Budget, model, follow-up date…" multiline />
        {showStatusNote ? (
          <View style={styles.note}>
            <Text style={styles.noteText}>New leads start as Pending. Mark them Deal Done from the lead page once the sale is complete.</Text>
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.subheading, marginBottom: spacing.lg },
  gap: { marginTop: spacing.lg },
  note: { backgroundColor: colors.pendingBg, borderRadius: 10, padding: spacing.md },
  noteText: { color: '#8a5200', fontSize: 13, lineHeight: 19 },
});
