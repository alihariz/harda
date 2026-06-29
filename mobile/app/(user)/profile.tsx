// Profile screen — language, logout, edit API base URL (handy for physical-phone demos).

import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field } from '@/components/Field';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/context/AuthContext';
import * as auth from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/lib/theme';

export default function Profile() {
  const { user, role, teamId, logout } = useAuth();
  const { t } = useI18n();
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
        <Text style={typography.h1}>{t('profile.title')}</Text>

        <View style={styles.card}>
          <Text style={typography.h3}>{t('profile.language')}</Text>
          <View style={{ marginTop: spacing.sm }}>
            <LanguageToggle />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={typography.h3}>{t('profile.account')}</Text>
          <Text style={styles.row}>{t('profile.role')} <Text style={styles.value}>{role ?? t('profile.guest')}</Text></Text>
          {user ? (
            <>
              <Text style={styles.row}>{t('profile.email')} <Text style={styles.value}>{user.email}</Text></Text>
              <Text style={styles.row}>{t('profile.name')} <Text style={styles.value}>{user.first_name} {user.last_name}</Text></Text>
            </>
          ) : null}
          {teamId ? (
            <Text style={styles.row}>{t('profile.teamId')} <Text style={styles.value}>{teamId}</Text></Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={typography.h3}>{t('profile.apiTitle')}</Text>
          <Text style={typography.caption}>
            {t('profile.apiHint')}
          </Text>
          <Field label={t('profile.baseUrl')} value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" />
          <PrimaryButton title={t('profile.save')} onPress={onSaveApi} variant="secondary" />
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
