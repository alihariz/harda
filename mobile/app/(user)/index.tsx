// User Home — nearby hazards map. UC003.
// Reads verified reports from /reports/map and clusters by colour.

import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, StyleSheet, Text, View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { colors, hazardColor, spacing, typography } from '@/lib/theme';

interface MapPoint {
  report_id: number;
  latitude: number;
  longitude: number;
  hazard_type: string | null;
  severity_score: number | null;
}

const MALAYSIA_CENTER = {
  latitude: 3.1390,
  longitude: 101.6869,
  latitudeDelta: 6.5,
  longitudeDelta: 6.5,
};

export default function UserHome() {
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<MapPoint[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.mapReports();
        setPoints(data);
      } catch (e) {
        Alert.alert('Could not load map', e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={[typography.h2, { color: '#fff' }]}>Nearby hazards</Text>
        <Text style={[typography.caption, { color: '#cbd5e1' }]}>
          {loading ? 'Loading…' : `${points.length} verified reports across Malaysia`}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={MALAYSIA_CENTER}
        >
          {points.map((p) => (
            <Marker
              key={p.report_id}
              coordinate={{ latitude: p.latitude, longitude: p.longitude }}
              pinColor={hazardColor(p.hazard_type)}
              title={p.hazard_type ?? 'Hazard'}
              description={`Severity ${p.severity_score ?? '–'} • Report #${p.report_id}`}
            />
          ))}
        </MapView>
        {loading ? (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={colors.primaryAccent} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: { padding: spacing.lg, backgroundColor: colors.primary },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
});
