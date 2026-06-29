// Login screen — single entry for users and field crew. The backend's JWT
// includes role=user|crew, which AuthContext then uses to route to the right
// experience after login resolves.

import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field } from '@/components/Field';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/lib/i18n';
import { colors, spacing, typography } from '@/lib/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert(t('login.missingTitle'), t('login.missingMsg'));
      return;
    }
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      router.replace(user.role === 'crew' ? '/(crew)' : '/(user)');
    } catch (e) {
      Alert.alert(t('login.failedTitle'), e instanceof Error ? e.message : t('common.unknownError'));
    } finally {
      setLoading(false);
    }
  };

  const onGuest = () => router.replace('/(user)/capture?guest=1');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.langRow}>
            <LanguageToggle />
          </View>
          <View style={styles.hero}>
            <Text style={styles.brand}>HARDA</Text>
            <Text style={styles.tag}>
              {t('login.tagline')}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={typography.h2}>{t('login.signIn')}</Text>
            <Text style={[typography.caption, { marginBottom: spacing.lg }]}>
              {t('login.signInSub')}
            </Text>

            <Field
              label={t('login.email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@example.com"
            />
            <Field
              label={t('login.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />

            <PrimaryButton title={t('login.signInBtn')} onPress={onSubmit} loading={loading} />
            <View style={{ height: spacing.sm }} />
            <PrimaryButton
              title={t('login.guestBtn')}
              onPress={onGuest}
              variant="secondary"
            />
          </View>

          <View style={styles.footer}>
            <Text style={typography.caption}>{t('login.noAccount')}</Text>
            <Link href="/(auth)/register" style={styles.link}>{t('login.register')}</Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  scroll: { flexGrow: 1, padding: spacing.lg },
  langRow: { alignItems: 'flex-end' },
  hero: { alignItems: 'center', paddingVertical: spacing.xl },
  brand: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  tag: { color: '#cbd5e1', textAlign: 'center', marginTop: spacing.sm, maxWidth: 280 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  link: { color: '#fff', fontWeight: '700' },
});
