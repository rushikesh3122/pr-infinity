import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InvoiceWebView } from './InvoiceWebView';
import { Button } from '../../components/ui';
import { colors, spacing, typography } from '../../theme';

interface Props {
  visible: boolean;
  html: string;
  onClose: () => void;
  onConfirm: () => void;
  confirming: boolean;
}

/** Full-screen preview of the draft invoice, exactly as it will appear in the PDF. */
export function InvoicePreviewModal({ visible, html, onClose, onConfirm, confirming }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Invoice preview</Text>
          <Text style={styles.sub}>Check the details. The invoice number is reserved when you generate.</Text>
        </View>
        <View style={styles.preview}>
          <InvoiceWebView html={html} />
        </View>
        <View style={styles.footer}>
          <Button title="Edit" variant="outline" icon="create-outline" onPress={onClose} style={styles.flex} disabled={confirming} />
          <Button title="Generate Invoice" variant="accent" icon="checkmark-circle" onPress={onConfirm} loading={confirming} style={styles.grow} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { ...typography.heading },
  sub: { ...typography.bodySmall, marginTop: 2 },
  preview: { flex: 1, marginHorizontal: spacing.md, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: '#eef1f6' },
  footer: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  flex: { flex: 1 },
  grow: { flex: 2 },
});
