import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { Button } from './Button';

export function LoadingView({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.center}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={34} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} icon="add" style={styles.action} /> : null}
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <View style={[styles.iconCircle, { backgroundColor: colors.dangerBg }]}>
        <Ionicons name="cloud-offline-outline" size={34} color={colors.danger} />
      </View>
      <Text style={styles.title}>Couldn’t load this</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <Button title="Try again" variant="outline" icon="refresh" onPress={onRetry} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl, minHeight: 280 },
  muted: { ...typography.bodySmall, marginTop: spacing.md },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { ...typography.heading, textAlign: 'center' },
  message: { ...typography.bodySmall, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20, maxWidth: 320 },
  action: { marginTop: spacing.xl, minWidth: 180 },
});
