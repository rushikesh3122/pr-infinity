import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, StatusBadge } from '../../components/ui';
import { colors, spacing, typography } from '../../theme';
import type { Invoice } from '../../types/models';
import { formatCurrency, formatDateLong } from '../../utils/format';

type InvoiceSummary = Pick<Invoice, 'invoiceNumber' | 'customerDetails' | 'invoiceDate' | 'grandTotal' | 'paymentStatus'>;

export function InvoiceCard({ invoice, onPress }: { invoice: InvoiceSummary; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Ionicons name="document-text" size={22} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.number}>{invoice.invoiceNumber}</Text>
          <Text style={styles.name} numberOfLines={1}>{invoice.customerDetails.name}</Text>
          <Text style={styles.date}>{formatDateLong(invoice.invoiceDate)}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>{formatCurrency(invoice.grandTotal)}</Text>
          <StatusBadge status={invoice.paymentStatus} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  number: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  name: { ...typography.subheading, marginTop: 2 },
  date: { ...typography.caption, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
  amount: { ...typography.subheading, fontWeight: '700' },
});
