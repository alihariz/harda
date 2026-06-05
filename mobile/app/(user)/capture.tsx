// Capture screen — UC001 / UC002.
// Two paths: take a fresh photo with expo-camera, or pick one from the library
// with expo-image-picker (preserves EXIF on iOS). Either way, the chosen
// image + best-guess GPS is handed off to /preview for review and submit.

import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { extractFromExif, getDeviceGps } from '@/lib/exif';
import { colors, radius, spacing, typography } from '@/lib/theme';

export default function CaptureScreen() {
  const [busy, setBusy] = useState<'camera' | 'library' | null>(null);

  const handleResult = async (asset: ImagePicker.ImagePickerAsset) => {
    // Best-effort GPS: EXIF first (most accurate to when the photo was taken),
    // device GPS as fallback. Backend will accept either.
    const exif = extractFromExif(asset.exif as Record<string, unknown> | undefined);
    const gps = exif ?? (await getDeviceGps());

    router.push({
      pathname: '/(user)/preview',
      params: {
        uri: asset.uri,
        mime: asset.mimeType ?? 'image/jpeg',
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
      Alert.alert('Camera permission needed', 'Allow camera access to capture hazards.');
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
      Alert.alert('Library permission needed', 'Allow photo access to pick existing hazards.');
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
        <Text style={[typography.h1, styles.title]}>Report a hazard</Text>
        <Text style={[typography.body, styles.subtitle]}>
          Snap a photo of the pothole, faded lane marking, or uneven surface.
          We'll auto-classify it with YOLO and geotag it from the photo's GPS data.
        </Text>

        <View style={styles.card}>
          <PrimaryButton title="📷  Take photo" onPress={pickFromCamera} loading={busy === 'camera'} />
          <View style={{ height: spacing.sm }} />
          <PrimaryButton title="🖼  Pick from library" onPress={pickFromLibrary} loading={busy === 'library'} variant="secondary" />
        </View>

        <Text style={styles.hint}>
          ✓ JPEG or PNG, max 10 MB{'\n'}
          ✓ GPS extracted from photo EXIF when present; device location used otherwise{'\n'}
          ✓ All submissions are auto-classified, then reviewed by an admin
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
