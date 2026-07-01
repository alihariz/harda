// Assignment detail — shows original photo + map + status + "Mark resolved"
// CTA that opens the after-photo capture flow.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert, Image, Linking, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { colors, hazardColor, radius, spacing, typography } from '@/lib/theme';
import type { HazardReport } from '@/lib/types';

export default function AssignmentDetail() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<HazardReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setReport(await api.getReport(Number(id)));
      } catch (e) {
        Alert.alert(t('crew.loadAssignmentErr'), e instanceof Error ? e.message : t('common.unknownError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading || !report) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={[typography.body, { padding: spacing.lg }]}>{t('crew.loadingAssignment')}</Text>
      </SafeAreaView>
    );
  }

  const openInMaps = () => {
    const { latitude, longitude } = report.location ?? {};
    if (latitude == null || longitude == null) return;
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${latitude},${longitude}`,
      android: `google.navigation:q=${latitude},${longitude}`,
    });
    if (url) Linking.openURL(url);
  };

  const isResolved = report.status?.status_name === 'resolved';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#fff' }}>{t('common.back')}</Text>
          </Pressable>
          <Text style={[typography.h2, { color: '#fff', marginTop: spacing.sm }]}>{report.title}</Text>
          <Text style={[typography.caption, { color: '#cbd5e1' }]}>{t('crew.assignmentNo', { id: report.report_id })}</Text>
          <View style={{ marginTop: spacing.sm, flexDirection: 'row', gap: spacing.sm }}>
            <StatusBadge status={report.status?.status_name} />
            <View style={[styles.tag, { backgroundColor: hazardColor(report.hazard_type?.type_name) }]}>
              <Text style={styles.tagText}>{report.hazard_type?.type_name ? t(`hazardType.${report.hazard_type.type_name}`) : '—'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {report.before_image ? (
            <Image
              source={{ uri: api.imageUrl(report.before_image.file_path) }}
              style={styles.photo}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.photo, styles.photoEmpty]}>
              <Text style={typography.caption}>{t('crew.noPhotoAttached')}</Text>
            </View>
          )}

          {report.location ? (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              region={{
                latitude: report.location.latitude,
                longitude: report.location.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: report.location.latitude,
                  longitude: report.location.longitude,
                }}
                pinColor={hazardColor(report.hazard_type?.type_name)}
              />
            </MapView>
          ) : null}

          <Text style={styles.address}>{report.location?.address_name}</Text>
          <Text style={typography.caption}>
            {report.location?.latitude}, {report.location?.longitude}
          </Text>

          {report.description ? (
            <Text style={[typography.body, { marginTop: spacing.md }]}>{report.description}</Text>
          ) : null}

          <View style={styles.actions}>
            <PrimaryButton title={t('crew.navigate')} onPress={openInMaps} variant="secondary" />
            <View style={{ height: spacing.sm }} />
            {isResolved ? (
              <Text style={[typography.body, { color: colors.success, textAlign: 'center' }]}>
                {t('crew.resolvedOn', { date: report.resolution_date?.slice(0, 10) ?? '' })}
              </Text>
            ) : (
              <PrimaryButton
                title={t('crew.markResolved')}
                onPress={() => router.push(`/(crew)/resolve/${report.report_id}`)}
              />
            )}
          </View>

          {report.after_image ? (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={typography.h3}>{t('crew.afterPhoto')}</Text>
              <Image
                source={{ uri: api.imageUrl(report.after_image.file_path) }}
                style={styles.photo}
                resizeMode="cover"
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: { padding: spacing.lg, backgroundColor: colors.primary },
  tag: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  tagText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  body: { padding: spacing.lg, backgroundColor: colors.surface },
  photo: {
    width: '100%', aspectRatio: 4 / 3,
    borderRadius: radius.lg, backgroundColor: colors.surfaceAlt,
  },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  map: {
    width: '100%', height: 200, marginTop: spacing.md,
    borderRadius: radius.lg, overflow: 'hidden',
  },
  address: { ...typography.h3, marginTop: spacing.md },
  actions: { marginTop: spacing.xl },
});
