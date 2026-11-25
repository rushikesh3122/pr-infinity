import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { goBack } from '../../utils/navigation';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ErrorView, LoadingView, Screen, SectionHeader, TextField } from '../../components/ui';
import { useSettings, useUpdateSettings } from '../../hooks/queries';
import { useToast } from '../../providers/ToastProvider';
import { getErrorMessage } from '../../api/client';
import { colors, spacing, typography } from '../../theme';

export default function BankSettingsScreen() {
  const { data, isLoading, error, refetch } = useSettings();
  const update = useUpdateSettings();
  const toast = useToast();
  const [bank, setBank] = useState({ accountName: '', ifscCode: '', accountNumber: '', bankName: '' });
  const [terms, setTerms] = useState<string[]>([]);

  useEffect(() => {
    if (!data) return;
    setBank({ ...data.company.bank });
    setTerms(data.company.terms.length ? data.company.terms : ['']);
  }, [data]);

  if (isLoading) return <LoadingView />;
  if (error || !data) return <ErrorView message={getErrorMessage(error)} onRetry={refetch} />;

  const save = async () => {
    try {
      await update.mutateAsync({ company: { bank: { ...bank, ifscCode: bank.ifscCode.toUpperCase() }, terms: terms.map((t) => t.trim()).filter(Boolean) } });
      toast.success('Bank details & terms saved');
      goBack('/settings');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const set = (key: keyof typeof bank) => (v: string) => setBank((b) => ({ ...b, [key]: v }));

  return (
    <Screen footer={<Button title="Save" icon="checkmark" onPress={save} loading={update.isPending} />}>
      <SectionHeader title="Bank details" />
      <Card>
        <TextField label="Account name" value={bank.accountName} onChangeText={set('accountName')} />
        <TextField label="IFSC code" value={bank.ifscCode} onChangeText={set('ifscCode')} autoCapitalize="characters" />
        <TextField label="Account number" value={bank.accountNumber} onChangeText={set('accountNumber')} keyboardType="number-pad" />
        <TextField label="Bank & branch" value={bank.bankName} onChangeText={set('bankName')} />
      </Card>
      <SectionHeader title="Terms and conditions" />
      <Text style={styles.note}>Each point prints as a bullet on the invoice.</Text>
      <Card>
        {terms.map((t, i) => (
          <View key={i} style={styles.termRow}>
            <View style={styles.flex}>
              <TextField label={`Point ${i + 1}`} value={t} onChangeText={(v) => setTerms((all) => all.map((x, j) => (j === i ? v : x)))} multiline />
            </View>
            <Pressable onPress={() => setTerms((all) => all.filter((_, j) => j !== i))} hitSlop={10} style={styles.remove} accessibilityLabel={`Remove point ${i + 1}`}>
              <Ionicons name="close-circle" size={22} color={colors.danger} />
            </Pressable>
          </View>
        ))}
        {terms.length < 15 ? <Button title="Add point" icon="add" variant="outline" size="sm" onPress={() => setTerms((all) => [...all, ''])} /> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  note: { ...typography.bodySmall, marginBottom: spacing.sm },
  termRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  remove: { marginTop: 32 },
});
