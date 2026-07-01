import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageToggle } from '@/components/LanguageToggle';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/lib/theme';
import type { User } from '@/lib/types';

export default function CrewProfile() {
  const { logout, role, teamId } = useAuth();
  const { t } = useI18n();
  const [me, setMe] = useState<User | null>(null);

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
        <Text style={typography.h1}>{t('crew.profileTitle')}</Text>

        <View style={styles.card}>
          <Text style={typography.h3}>{t('profile.language')}</Text>
          <View style={{ marginTop: spacing.sm }}>
            <LanguageToggle />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={typography.h3}>{t('profile.account')}</Text>
          <Text style={styles.row}>{t('profile.role')} <Text style={styles.value}>{role ?? '—'}</Text></Text>
          {me ? (
            <>
              <Text style={styles.row}>{t('profile.name')} <Text style={styles.value}>{me.first_name} {me.last_name}</Text></Text>
              <Text style={styles.row}>{t('profile.email')} <Text style={styles.value}>{me.email}</Text></Text>
            </>
          ) : null}
          {teamId ? (
            <Text style={styles.row}>{t('profile.teamId')} <Text style={styles.value}>{teamId}</Text></Text>
          ) : null}
        </View>

        <PrimaryButton title={t('profile.signOut')} onPress={onLogout} variant="danger" />
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
