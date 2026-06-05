// Preview screen — review photo + GPS, optionally edit title/description, submit.
// On success, shows the YOLO detection result + tracking ID.

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert, Image, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { api } from '@/lib/api';
import { colors, radius, spacing, typography } from '@/lib/theme';

export default function PreviewScreen() {
  const params = useLocalSearchParams<{
    uri: string; mime?: string; fileName?: string;
    lat?: string; lng?: string; gpsSource?: string;
  }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState(params.lat ?? '');
  const [lng, setLng] = useState(params.lng ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    report_id: number;
    detection?: { hazard_type?: string; confidence?: number; low_confidence: boolean; inference_ms?: number };
  } | null>(null);

  const onSubmit = async () => {
    if (!params.uri) {
      Alert.alert('No image', 'Go back and pick a photo first.');
      return;
    }
    if (!lat || !lng) {
      Alert.alert(
        'No GPS',
        'EXIF and device GPS both failed. Type approximate latitude/longitude.'
      );
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      // React Native's FormData blob shape: { uri, name, type }
      form.append('image', {
        uri: params.uri,
        name: params.fileName ?? `harda_${Date.now()}.jpg`,
        type: params.mime ?? 'image/jpeg',
      } as unknown as Blob);
      form.append('latitude', lat);
      form.append('longitude', lng);
      if (title) form.append('title', title);
      if (description) form.append('description', description);

      const r = await api.submitReport(form);
      setResult({ report_id: r.report_id, detection: r.detection });
    } catch (e) {
      Alert.alert('Submission failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const d = result.detection;
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[typography.h1, { color: colors.success }]}>Submitted ✓</Text>
          <Text style={[typography.body, { color: colors.muted, marginTop: spacing.sm }]}>
            Tracking ID #{result.report_id}
          </Text>

          <View style={styles.resultCard}>
            {d?.low_confidence || !d?.hazard_type ? (
              <>
                <Text style={typography.h3}>Flagged for review</Text>
                <Text style={[typography.body, { marginTop: spacing.sm }]}>
                  Our AI wasn't confident enough to classify this automatically. An admin will review it before it appears on the map.
                </Text>
              </>
            ) : (
              <>
                <Text style={typography.h3}>AI detected</Text>
                <Text style={[styles.resultValue, { fontSize: 18, marginTop: spacing.xs }]}>
                  {d.hazard_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </Text>
                <Text style={[typography.body, { color: '#6b7280', marginTop: spacing.xs }]}>
                  {((d.confidence ?? 0) * 100).toFixed(0)}% confidence
                </Text>
              </>
            )}
          </View>

          <PrimaryButton
            title="View my reports"
            onPress={() => router.replace('/(user)/my-reports')}
          />
          <View style={{ height: spacing.sm }} />
          <PrimaryButton
            title="Submit another"
            variant="secondary"
            onPress={() => router.replace('/(user)/capture')}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={typography.h1}>Review</Text>

        {params.uri ? (
          <Image source={{ uri: params.uri }} style={styles.preview} resizeMode="cover" />
        ) : null}

        <View style={styles.gpsBox}>
          <Text style={typography.h3}>Location</Text>
          <Text style={typography.caption}>
            {params.gpsSource === 'exif'
              ? 'GPS extracted from photo EXIF'
              : params.gpsSource === 'device'
                ? 'GPS from your current device location'
                : 'No GPS available — please enter manually'}
          </Text>
          <Field label="Latitude"  value={lat} onChangeText={setLat}  keyboardType="numeric" />
          <Field label="Longitude" value={lng} onChangeText={setLng} keyboardType="numeric" />
        </View>

        <Field
          label="Title (optional)"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Pothole on Jalan Bukit Bintang"
        />
        <Field
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Any extra context?"
          multiline
          numberOfLines={3}
        />

        <PrimaryButton title="Submit hazard report" onPress={onSubmit} loading={submitting} />
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
  gpsBox: {
    backgroundColor: colors.surfaceAlt, padding: spacing.md,
    borderRadius: radius.md, marginBottom: spacing.md,
  },
  resultCard: {
    backgroundColor: colors.surfaceAlt, padding: spacing.lg,
    borderRadius: radius.lg, marginVertical: spacing.lg,
  },
  resultRow: { fontSize: 15, marginTop: spacing.xs, color: colors.primary },
  resultValue: { fontWeight: '700' },
});
