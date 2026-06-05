// Profile screen — logout, edit API base URL (handy for physical-phone demos).

import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/context/AuthContext';
import * as auth from '@/lib/auth';
import { colors, radius, spacing, typography } from '@/lib/theme';

export default function Profile() {
  const { user, role, teamId, logout } = useAuth();
  const [apiUrl, setApiUrl] = useState('');

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const onSaveApi = async () => {
    await auth.setApiOverride(apiUrl.trim() || null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={typography.h1}>Profile</Text>

        <View style={styles.card}>
          <Text style={typography.h3}>Account</Text>
          <Text style={styles.row}>Role: <Text style={styles.value}>{role ?? 'guest'}</Text></Text>
          {user ? (
            <>
              <Text style={styles.row}>Email: <Text style={styles.value}>{user.email}</Text></Text>
              <Text style={styles.row}>Name: <Text style={styles.value}>{user.first_name} {user.last_name}</Text></Text>
            </>
          ) : null}
          {teamId ? (
            <Text style={styles.row}>Team ID: <Text style={styles.value}>{teamId}</Text></Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={typography.h3}>API base URL (override)</Text>
          <Text style={typography.caption}>
            Useful when running on a physical phone — point this at your dev machine's LAN IP,
            e.g. http://192.168.1.100:5000/api/v1
          </Text>
          <Field label="Base URL" value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" />
          <PrimaryButton title="Save" onPress={onSaveApi} variant="secondary" />
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
