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
import { useI18n } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/lib/theme';

export default function PreviewScreen() {
  const { t } = useI18n();
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
      Alert.alert(t('preview.noImageTitle'), t('preview.noImageMsg'));
      return;
    }
    if (!lat || !lng) {
      Alert.alert(t('preview.noGpsTitle'), t('preview.noGpsMsg'));
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
      Alert.alert(t('preview.submitFailedTitle'), e instanceof Error ? e.message : t('common.unknownError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const d = result.detection;
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[typography.h1, { color: colors.success }]}>{t('preview.submittedTitle')}</Text>
          <Text style={[typography.body, { color: colors.muted, marginTop: spacing.sm }]}>
            {t('preview.trackingId', { id: result.report_id })}
          </Text>

          <View style={styles.resultCard}>
            {d?.low_confidence || !d?.hazard_type ? (
              <>
                <Text style={typography.h3}>{t('preview.flaggedTitle')}</Text>
                <Text style={[typography.body, { marginTop: spacing.sm }]}>
                  {t('preview.flaggedMsg')}
                </Text>
              </>
            ) : (
              <>
                <Text style={typography.h3}>{t('preview.aiDetected')}</Text>
                <Text style={[styles.resultValue, { fontSize: 18, marginTop: spacing.xs }]}>
                  {t(`hazardType.${d.hazard_type}`)}
                </Text>
                <Text style={[typography.body, { color: '#6b7280', marginTop: spacing.xs }]}>
                  {t('preview.confidence', { pct: ((d.confidence ?? 0) * 100).toFixed(0) })}
                </Text>
              </>
            )}
          </View>

          <PrimaryButton
            title={t('preview.viewReports')}
            onPress={() => router.replace('/(user)/my-reports')}
          />
          <View style={{ height: spacing.sm }} />
          <PrimaryButton
            title={t('preview.submitAnother')}
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
        <Text style={typography.h1}>{t('preview.review')}</Text>

        {params.uri ? (
          <Image source={{ uri: params.uri }} style={styles.preview} resizeMode="cover" />
        ) : null}

        <View style={styles.gpsBox}>
          <Text style={typography.h3}>{t('preview.location')}</Text>
          <Text style={typography.caption}>
            {params.gpsSource === 'exif'
              ? t('preview.gpsExif')
              : params.gpsSource === 'device'
                ? t('preview.gpsDevice')
                : t('preview.gpsNone')}
          </Text>
          <Field label={t('preview.latitude')}  value={lat} onChangeText={setLat}  keyboardType="numeric" />
          <Field label={t('preview.longitude')} value={lng} onChangeText={setLng} keyboardType="numeric" />
        </View>

        <Field
          label={t('preview.titleOptional')}
          value={title}
          onChangeText={setTitle}
          placeholder={t('preview.titlePlaceholder')}
        />
        <Field
          label={t('preview.descOptional')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('preview.descPlaceholder')}
          multiline
          numberOfLines={3}
        />

        <PrimaryButton title={t('preview.submitBtn')} onPress={onSubmit} loading={submitting} />
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
