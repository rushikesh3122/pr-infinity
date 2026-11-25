import { useState } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Button, Card, Screen, SectionHeader } from '../../components/ui';
import { exportBackup, importBackup } from '../../data/localApi';
import { useToast } from '../../providers/ToastProvider';
import { useConfirm } from '../../providers/DialogProvider';
import { getErrorMessage } from '../../api/client';
import { spacing, typography } from '../../theme';

export default function BackupScreen() {
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  const doExport = async () => {
    setBusy('export');
    try {
      const json = await exportBackup();
      const stamp = new Date().toISOString().slice(0, 10);
      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        a.download = `pr-infinity-backup-${stamp}.json`;
        a.click();
        return;
      }
      const file = new File(Paths.cache, `pr-infinity-backup-${stamp}.json`);
      if (file.exists) file.delete();
      file.create();
      await file.write(json);
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save backup' });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const doImport = async () => {
    const ok = await confirm({
      title: 'Restore from backup?',
      message: 'This replaces ALL leads, invoices and settings on this phone with the ones in the backup file.',
      confirmText: 'Choose file',
      tone: 'danger',
      icon: 'cloud-download-outline',
    });
    if (!ok) return;
    setBusy('import');
    try {
      let text: string;
      if (Platform.OS === 'web') {
        text = await new Promise<string>((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'application/json,.json';
          input.onchange = () => (input.files?.[0] ? input.files[0].text().then(resolve, reject) : reject(new Error('cancelled')));
          input.click();
        });
      } else {
        const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
        if (picked.canceled) return;
        text = await picked.result.text();
      }
      const result = await importBackup(text);
      await qc.invalidateQueries();
      toast.success(`Restored ${result.leads} leads and ${result.invoices} invoices`);
    } catch (err) {
      const msg = getErrorMessage(err);
      if (!/cancel/i.test(msg)) toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <SectionHeader title="Backup" />
      <Card>
        <Text style={styles.text}>
          Creates one file with all your leads, invoices and settings. Save it to Google Drive, WhatsApp it to yourself, or keep it on a computer.
        </Text>
        <Button title="Create backup" icon="cloud-upload-outline" onPress={doExport} loading={busy === 'export'} disabled={busy === 'import'} />
      </Card>
      <SectionHeader title="Restore" />
      <Card>
        <Text style={styles.text}>Use this on a new phone, or after reinstalling the app, to bring your data back from a backup file.</Text>
        <Button title="Restore from file" icon="cloud-download-outline" variant="outline" onPress={doImport} loading={busy === 'import'} disabled={busy === 'export'} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { ...typography.bodySmall, lineHeight: 20, marginBottom: spacing.lg },
});
