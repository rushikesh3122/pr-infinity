import { useState } from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen, SectionHeader } from '../../components/ui';
import { exportBackup, importBackup } from '../../data/localApi';
import { excelToCache, exportEverything, pickFolder } from '../../features/backup/exporters';
import { useToast } from '../../providers/ToastProvider';
import { useConfirm } from '../../providers/DialogProvider';
import { getErrorMessage } from '../../api/client';
import { colors, radius, spacing, typography } from '../../theme';

type Busy = 'save' | 'shareBackup' | 'shareExcel' | 'import' | null;

function Toggle({ icon, title, subtitle, value, onChange }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <View style={styles.toggleIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSub}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.borderStrong }} thumbColor="#fff" />
    </View>
  );
}

export default function BackupScreen() {
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<Busy>(null);
  const [progress, setProgress] = useState('');
  const [parts, setParts] = useState({ backup: true, excel: true, pdfs: true });
  const stamp = new Date().toISOString().slice(0, 10);

  const saveToPhone = async () => {
    if (!parts.backup && !parts.excel && !parts.pdfs) {
      toast.error('Turn on at least one item to save');
      return;
    }
    if (Platform.OS !== 'android') {
      toast.error('Saving to a folder is available on Android. Use the share buttons below.');
      return;
    }
    toast.show('Choose a folder, for example Download. Tip: create a new folder "PR Infinity".');
    const folder = await pickFolder();
    if (!folder) return;
    setBusy('save');
    try {
      const r = await exportEverything(folder, parts, setProgress);
      toast.success(`Saved ${r.files} file${r.files === 1 ? '' : 's'} to your phone`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(null);
      setProgress('');
    }
  };

  const shareBackup = async () => {
    setBusy('shareBackup');
    try {
      const json = await exportBackup();
      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        a.download = `PR-Infinity-backup-${stamp}.json`;
        a.click();
        return;
      }
      const file = new File(Paths.cache, `PR-Infinity-backup-${stamp}.json`);
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

  const shareExcel = async () => {
    setBusy('shareExcel');
    try {
      const file = await excelToCache();
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        UTI: 'org.openxmlformats.spreadsheetml.sheet',
        dialogTitle: 'Share Excel',
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const doImport = async () => {
    const ok = await confirm({
      title: 'Restore from backup?',
      message: 'This replaces ALL leads, invoices and settings on this phone with the ones in the backup (.json) file.',
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
      <SectionHeader title="Save to phone storage" />
      <Card>
        <Text style={styles.text}>
          Saves your data as files in a folder you choose (for example Download). You can open them in the Files app, copy them to a computer or Google Drive, and they stay even if the app is uninstalled.
        </Text>
        <Toggle icon="grid-outline" title="Excel sheet (.xlsx)" subtitle="Leads, invoices and invoice items in one file" value={parts.excel} onChange={(v) => setParts((p) => ({ ...p, excel: v }))} />
        <Toggle icon="document-text-outline" title="All invoice PDFs" subtitle="One PDF per invoice, in your invoice format" value={parts.pdfs} onChange={(v) => setParts((p) => ({ ...p, pdfs: v }))} />
        <Toggle icon="shield-checkmark-outline" title="Backup file (.json)" subtitle="Needed to restore everything into the app" value={parts.backup} onChange={(v) => setParts((p) => ({ ...p, backup: v }))} />
        {progress ? (
          <View style={styles.progress}>
            <Ionicons name="hourglass-outline" size={16} color={colors.primary} />
            <Text style={styles.progressText}>{progress}</Text>
          </View>
        ) : null}
        <Button title="Choose folder & save" icon="download-outline" onPress={saveToPhone} loading={busy === 'save'} disabled={!!busy && busy !== 'save'} />
      </Card>

      <SectionHeader title="Share" />
      <Card style={styles.gapCard}>
        <Text style={styles.text}>Send a copy to Google Drive, Gmail or WhatsApp.</Text>
        <Button title="Share Excel sheet" icon="grid-outline" variant="outline" onPress={shareExcel} loading={busy === 'shareExcel'} disabled={!!busy && busy !== 'shareExcel'} />
        <Button title="Share backup file" icon="cloud-upload-outline" variant="outline" onPress={shareBackup} loading={busy === 'shareBackup'} disabled={!!busy && busy !== 'shareBackup'} />
      </Card>

      <SectionHeader title="Restore" />
      <Card>
        <Text style={styles.text}>On a new phone, or after reinstalling the app, choose your backup (.json) file to bring everything back.</Text>
        <Button title="Restore from backup file" icon="cloud-download-outline" variant="dangerOutline" onPress={doImport} loading={busy === 'import'} disabled={!!busy && busy !== 'import'} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  text: { ...typography.bodySmall, lineHeight: 20, marginBottom: spacing.lg },
  gapCard: { gap: spacing.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  toggleIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  toggleTitle: { ...typography.subheading, fontSize: 14 },
  toggleSub: { ...typography.caption, marginTop: 1 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryLight, padding: spacing.md, borderRadius: radius.sm, marginBottom: spacing.md },
  progressText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
});
