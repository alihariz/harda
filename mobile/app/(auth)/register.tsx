// Public user registration. Field-crew accounts are created by an admin (out
// of mobile-app scope) — they don't self-register.

import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { colors, spacing, typography } from '@/lib/theme';

export default function RegisterScreen() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [username,  setUsername]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [loading,   setLoading]   = useState(false);

  const onSubmit = async () => {
    if (!username || !email || !password) {
      Alert.alert(t('register.missingTitle'), t('register.missingMsg'));
      return;
    }
    setLoading(true);
    try {
      await api.register({
        username: username.trim(),
        email: email.trim(),
        password,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
      });
      const user = await login(email.trim(), password);
      router.replace(user.role === 'crew' ? '/(crew)' : '/(user)');
    } catch (e) {
      Alert.alert(t('register.failedTitle'), e instanceof Error ? e.message : t('common.unknownError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[typography.h1, { color: '#fff', textAlign: 'center' }]}>
            {t('register.title')}
          </Text>

          <View style={styles.card}>
            <Field label={t('register.firstName')} value={firstName} onChangeText={setFirstName} />
            <Field label={t('register.lastName')}  value={lastName}  onChangeText={setLastName} />
            <Field label={t('register.username')}   value={username}  onChangeText={setUsername} autoCapitalize="none" />
            <Field label={t('register.email')}      value={email}     onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Field label={t('register.password')}   value={password}  onChangeText={setPassword} secureTextEntry />

            <PrimaryButton title={t('register.createBtn')} onPress={onSubmit} loading={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={typography.caption}>{t('register.haveAccount')}</Text>
            <Link href="/(auth)/login" style={styles.link}>{t('register.signIn')}</Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  scroll: { flexGrow: 1, padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg, marginTop: spacing.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg },
  link: { color: '#fff', fontWeight: '700' },
});
