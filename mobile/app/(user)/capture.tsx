// Capture screen — UC001 / UC002.
// Two paths: take a fresh photo with expo-camera, or pick one from the library
// with expo-image-picker (preserves EXIF on iOS). Either way, the chosen
// image + best-guess GPS is handed off to /preview for review and submit.

import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { extractFromExif, getDeviceGps } from '@/lib/exif';
import { useI18n } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/lib/theme';

export default function CaptureScreen() {
  const { t } = useI18n();
  const [busy, setBusy] = useState<'camera' | 'library' | null>(null);

  const handleResult = async (asset: ImagePicker.ImagePickerAsset) => {
    // Best-effort GPS: EXIF first (most accurate to when the photo was taken),
    // device GPS as fallback. Backend will accept either.
    const exif = extractFromExif(asset.exif as Record<string, unknown> | undefined);
    const gps = exif ?? (await getDeviceGps());

    // Downscale + compress before upload. A raw phone photo is several MB, which
    // dominates upload time and backend decode/inference. ~1280px @ 0.7 quality
    // keeps enough detail for YOLO while shrinking the payload to a few hundred KB.
    let uri = asset.uri;
    try {
      const rendered = await ImageManipulator.manipulate(asset.uri).resize({ width: 1280 }).renderAsync();
      const out = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
      uri = out.uri;
    } catch {
      // Fall back to the original image if manipulation is unavailable.
    }

    router.push({
      pathname: '/(user)/preview',
      params: {
        uri,
        mime: 'image/jpeg',
        fileName: asset.fileName ?? `harda_${Date.now()}.jpg`,
        lat: gps?.lat?.toString() ?? '',
        lng: gps?.lng?.toString() ?? '',
        gpsSource: gps?.source ?? 'none',
      },
    });
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('capture.camPermTitle'), t('capture.camPermMsg'));
      return;
    }
    setBusy('camera');
    try {
      const r = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        exif: true,
      });
      if (!r.canceled && r.assets[0]) await handleResult(r.assets[0]);
    } finally { setBusy(null); }
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('capture.libPermTitle'), t('capture.libPermMsg'));
      return;
    }
    setBusy('library');
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        exif: true,
      });
      if (!r.canceled && r.assets[0]) await handleResult(r.assets[0]);
    } finally { setBusy(null); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[typography.h1, styles.title]}>{t('capture.title')}</Text>
        <Text style={[typography.body, styles.subtitle]}>
          {t('capture.subtitle')}
        </Text>

        <View style={styles.card}>
          <PrimaryButton title={t('capture.takePhoto')} onPress={pickFromCamera} loading={busy === 'camera'} />
          <View style={{ height: spacing.sm }} />
          <PrimaryButton title={t('capture.pickLibrary')} onPress={pickFromLibrary} loading={busy === 'library'} variant="secondary" />
        </View>

        <Text style={styles.hint}>
          {t('capture.hint')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.lg },
  title: { color: colors.primary },
  subtitle: { color: colors.muted, marginTop: spacing.sm, marginBottom: spacing.xl },
  card: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: spacing.xl },
});
