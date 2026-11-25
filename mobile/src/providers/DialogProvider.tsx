import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import { Button } from '../components/ui/Button';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'default' | 'danger' | 'success';
  icon?: keyof typeof Ionicons.glyphMap;
}

const DialogContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Promise-based confirmation dialog: `if (await confirm({...})) doIt()`. */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOptions(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  const tone = options?.tone ?? 'default';
  const toneColor = tone === 'danger' ? colors.danger : tone === 'success' ? colors.success : colors.primary;
  const toneBg = tone === 'danger' ? colors.dangerBg : tone === 'success' ? colors.successBg : colors.primaryLight;

  return (
    <DialogContext.Provider value={confirm}>
      {children}
      <Modal visible={!!options} transparent animationType="fade" onRequestClose={() => close(false)} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={() => close(false)}>
          <Pressable style={styles.card} onPress={() => undefined}>
            <View style={[styles.iconWrap, { backgroundColor: toneBg }]}>
              <Ionicons name={options?.icon ?? (tone === 'danger' ? 'trash-outline' : 'help-circle-outline')} size={28} color={toneColor} />
            </View>
            <Text style={styles.title}>{options?.title}</Text>
            {options?.message ? <Text style={styles.message}>{options.message}</Text> : null}
            <View style={styles.actions}>
              <Button title={options?.cancelText ?? 'Cancel'} variant="secondary" onPress={() => close(false)} style={styles.flex} />
              <Button
                title={options?.confirmText ?? 'Confirm'}
                variant={tone === 'danger' ? 'danger' : tone === 'success' ? 'success' : 'primary'}
                onPress={() => close(true)}
                style={styles.flex}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useConfirm must be used inside DialogProvider');
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xxl },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xxl, alignItems: 'center', maxWidth: 420, width: '100%', alignSelf: 'center' },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { ...typography.heading, textAlign: 'center' },
  message: { ...typography.bodySmall, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xxl, alignSelf: 'stretch' },
  flex: { flex: 1 },
});
