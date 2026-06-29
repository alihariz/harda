// UC005 — My Reports. The logged-in user sees their submissions and current status.
// Guest users (no user_id) get a friendly empty state.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList, RefreshControl, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { colors, hazardColor, radius, spacing, typography } from '@/lib/theme';
import type { HazardReport } from '@/lib/types';

export default function MyReports() {
  const { user, role } = useAuth();
  const { t } = useI18n();
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.user_id) {
      setReports([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.myReports(user.user_id);
      setReports(data);
    } finally {
      setLoading(false);
    }
  }, [user?.user_id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={[typography.h2, { color: '#fff' }]}>{t('myReports.title')}</Text>
        <Text style={[typography.caption, { color: '#cbd5e1' }]}>
          {role === 'user' ? t('myReports.subUser') : t('myReports.subGuest')}
        </Text>
      </View>
      <FlatList
        data={reports}
        keyExtractor={(r) => String(r.report_id)}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          <Text style={[typography.body, { color: colors.muted, textAlign: 'center', marginTop: spacing.xxl }]}>
            {role === 'user'
              ? t('myReports.emptyUser')
              : t('myReports.emptyGuest')}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={[styles.swatch, { backgroundColor: hazardColor(item.hazard_type?.type_name) }]} />
            <View style={{ flex: 1 }}>
              <Text style={typography.h3} numberOfLines={1}>{item.title}</Text>
              <Text style={[typography.caption, { marginTop: 2 }]}>
                #{item.report_id} • {item.hazard_type?.type_name ? t(`hazardType.${item.hazard_type.type_name}`) : t('myReports.awaitingClassification')}
                {item.severity_score ? ` • ${t('myReports.severity', { n: item.severity_score })}` : ''}
              </Text>
              <View style={{ marginTop: spacing.xs }}>
                <StatusBadge status={item.status?.status_name} />
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: { padding: spacing.lg },
  row: {
    flexDirection: 'row', backgroundColor: colors.surface,
    padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm,
    gap: spacing.md, alignItems: 'center',
  },
  swatch: { width: 6, height: 56, borderRadius: 3 },
});
