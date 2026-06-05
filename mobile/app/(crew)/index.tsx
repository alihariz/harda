// Crew assignment inbox. Reads /crew/assignments — only the logged-in crew
// member's team appears. Tapping a card opens the assignment detail.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList, Pressable, RefreshControl, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';
import { colors, hazardColor, radius, spacing, typography } from '@/lib/theme';
import type { HazardReport } from '@/lib/types';

export default function CrewInbox() {
  const [items, setItems] = useState<HazardReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [includeResolved, setIncludeResolved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.myAssignments(includeResolved);
      setItems(data.assignments);
    } finally {
      setLoading(false);
    }
  }, [includeResolved]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={[typography.h2, { color: '#fff' }]}>Assignments</Text>
        <Text style={[typography.caption, { color: '#cbd5e1' }]}>
          {loading ? 'Loading…' : `${items.length} ${includeResolved ? 'total' : 'open'}`}
        </Text>
        <Pressable
          style={styles.toggle}
          onPress={() => setIncludeResolved((v) => !v)}
        >
          <Text style={styles.toggleText}>
            {includeResolved ? 'Hide resolved' : 'Show resolved'}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(r) => String(r.report_id)}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          <Text style={[typography.body, { color: colors.muted, textAlign: 'center', marginTop: spacing.xxl }]}>
            No assignments right now. New ones appear here automatically.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/(crew)/assignment/${item.report_id}`)}
          >
            <View style={[styles.swatch, { backgroundColor: hazardColor(item.hazard_type?.type_name) }]} />
            <View style={{ flex: 1 }}>
              <Text style={typography.h3} numberOfLines={1}>{item.title}</Text>
              <Text style={typography.caption}>
                {item.location?.address_name ?? `${item.location?.latitude}, ${item.location?.longitude}`}
              </Text>
              <Text style={typography.caption}>
                {item.hazard_type?.type_name ?? '—'}
                {item.severity_score ? ` • severity ${item.severity_score}` : ''}
              </Text>
              <View style={{ marginTop: spacing.xs }}>
                <StatusBadge status={item.status?.status_name} />
              </View>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: { padding: spacing.lg },
  toggle: {
    marginTop: spacing.sm, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill,
  },
  toggleText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  card: {
    flexDirection: 'row', backgroundColor: colors.surface,
    padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm,
    gap: spacing.md, alignItems: 'center',
  },
  swatch: { width: 6, height: 72, borderRadius: 3 },
});
