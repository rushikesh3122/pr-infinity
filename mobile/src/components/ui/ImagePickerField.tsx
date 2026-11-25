import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';

/**
 * Picks an image and stores it as a compact data URI (resized to <= maxSize px, JPEG/PNG),
 * so it can be embedded in invoices and rendered offline.
 */
export function ImagePickerField({ label, value, onChange, hint, maxSize = 400, keepTransparency }: { label: string; value: string; onChange: (dataUri: string) => void; hint?: string; maxSize?: number; keepTransparency?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async () => {
    setError('');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Allow photo access to choose an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: true });
    if (result.canceled || !result.assets[0]) return;
    setBusy(true);
    try {
      const asset = result.assets[0];
      const scale = Math.min(1, maxSize / Math.max(asset.width || maxSize, asset.height || maxSize));
      const out = await manipulateAsync(
        asset.uri,
        scale < 1 ? [{ resize: { width: Math.round((asset.width || maxSize) * scale) } }] : [],
        { base64: true, compress: 0.85, format: keepTransparency ? SaveFormat.PNG : SaveFormat.JPEG },
      );
      if (!out.base64) throw new Error('Could not read the image');
      onChange(`data:image/${keepTransparency ? 'png' : 'jpeg'};base64,${out.base64}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not use that image');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable onPress={pick} style={styles.box} accessibilityRole="button" accessibilityLabel={`Choose ${label}`}>
          {value ? <Image source={{ uri: value }} style={styles.image} resizeMode="contain" /> : <Ionicons name="image-outline" size={28} color={colors.textMuted} />}
        </Pressable>
        <View style={styles.flex}>
          <Pressable onPress={pick} disabled={busy}>
            <Text style={styles.link}>{busy ? 'Processing…' : value ? 'Change image' : 'Choose image'}</Text>
          </Pressable>
          {value ? (
            <Pressable onPress={() => onChange('')}>
              <Text style={[styles.link, { color: colors.danger }]}>Remove</Text>
            </Pressable>
          ) : null}
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { ...typography.label, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  box: { width: 96, height: 96, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  image: { width: 90, height: 90 },
  flex: { flex: 1, gap: spacing.sm },
  link: { color: colors.primary, fontWeight: '700' },
  hint: { ...typography.caption },
  error: { color: colors.danger, fontSize: 12 },
});
