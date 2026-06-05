// After-photo capture + upload. POSTs to /reports/:id/after-photo as the
// authenticated crew user. On success, the backend transitions status to
// resolved and the inbox refreshes on focus.

import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Alert, Image, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { api } from '@/lib/api';
import { colors, radius, spacing, typography } from '@/lib/theme';

export default function ResolveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [uri, setUri] = useState<string | null>(null);
  const [mime, setMime] = useState<string>('image/jpeg');
  const [fileName, setFileName] = useState<string>(`harda_${Date.now()}.jpg`);
  const [submitting, setSubmitting] = useState(false);

  const capture = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera permission needed', 'Allow camera access to capture the after-photo.');
      return;
    }
    const r = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      exif: true,
    });
    if (!r.canceled && r.assets[0]) {
      setUri(r.assets[0].uri);
      setMime(r.assets[0].mimeType ?? 'image/jpeg');
      setFileName(r.assets[0].fileName ?? `harda_${id}_after_${Date.now()}.jpg`);
    }
  };

  const onSubmit = async () => {
    if (!uri) {
      Alert.alert('No photo', 'Capture an after-photo first.');
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('image', {
        uri,
        name: fileName,
        type: mime,
      } as unknown as Blob);
      await api.uploadAfterPhoto(Number(id), form);
      Alert.alert('Resolved ✓', 'After-photo uploaded; assignment marked resolved.', [
        { text: 'OK', onPress: () => router.replace('/(crew)') },
      ]);
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={typography.h1}>Mark as resolved</Text>
        <Text style={[typography.body, { color: colors.muted, marginTop: spacing.sm }]}>
          Capture a photo of the repaired hazard. This is uploaded as the
          'after' image and becomes part of the audit-ready archive.
        </Text>

        {uri ? (
          <Image source={{ uri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={[styles.preview, styles.previewEmpty]}>
            <Text style={typography.caption}>Tap "Capture after-photo" below</Text>
          </View>
        )}

        <PrimaryButton title={uri ? 'Retake' : 'Capture after-photo'} onPress={capture} variant="secondary" />
        <View style={{ height: spacing.sm }} />
        <PrimaryButton
          title="Upload + mark resolved"
          onPress={onSubmit}
          loading={submitting}
          disabled={!uri}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.lg },
  preview: {
    width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg,
    marginVertical: spacing.lg, backgroundColor: colors.surfaceAlt,
  },
  previewEmpty: { alignItems: 'center', justifyContent: 'center' },
});
