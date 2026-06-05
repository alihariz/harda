import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import * as auth from '@/lib/auth';
import { colors, radius, spacing, typography } from '@/lib/theme';
import type { User } from '@/lib/types';

export default function CrewProfile() {
  const { logout, role, teamId } = useAuth();
  const [me, setMe] = useState<User | null>(null);
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    (async () => {
      try { setMe(await api.crewMe()); } catch { /* ignore */ }
    })();
  }, []);

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={typography.h1}>Crew profile</Text>

        <View style={styles.card}>
          <Text style={typography.h3}>Account</Text>
          <Text style={styles.row}>Role: <Text style={styles.value}>{role ?? '—'}</Text></Text>
          {me ? (
            <>
              <Text style={styles.row}>Name: <Text style={styles.value}>{me.first_name} {me.last_name}</Text></Text>
              <Text style={styles.row}>Email: <Text style={styles.value}>{me.email}</Text></Text>
            </>
          ) : null}
          {teamId ? (
            <Text style={styles.row}>Team ID: <Text style={styles.value}>{teamId}</Text></Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={typography.h3}>API base URL (override)</Text>
          <Field label="Base URL" value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" />
          <PrimaryButton title="Save" onPress={() => auth.setApiOverride(apiUrl || null)} variant="secondary" />
        </View>

        <PrimaryButton title="Sign out" onPress={onLogout} variant="danger" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.lg },
  card: {
    backgroundColor: colors.surfaceAlt, padding: spacing.lg,
    borderRadius: radius.lg, marginTop: spacing.lg,
  },
  row: { marginTop: spacing.sm, color: colors.primary },
  value: { fontWeight: '600' },
});
