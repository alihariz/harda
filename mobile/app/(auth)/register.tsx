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
import { colors, spacing, typography } from '@/lib/theme';

export default function RegisterScreen() {
  const { login } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [username,  setUsername]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [loading,   setLoading]   = useState(false);

  const onSubmit = async () => {
    if (!username || !email || !password) {
      Alert.alert('Missing details', 'Username, email and password are required.');
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
      Alert.alert('Registration failed', e instanceof Error ? e.message : 'Unknown error');
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
            Create account
          </Text>

          <View style={styles.card}>
            <Field label="First name" value={firstName} onChangeText={setFirstName} />
            <Field label="Last name"  value={lastName}  onChangeText={setLastName} />
            <Field label="Username"   value={username}  onChangeText={setUsername} autoCapitalize="none" />
            <Field label="Email"      value={email}     onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Field label="Password"   value={password}  onChangeText={setPassword} secureTextEntry />

            <PrimaryButton title="Create account" onPress={onSubmit} loading={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={typography.caption}>Already have an account? </Text>
            <Link href="/(auth)/login" style={styles.link}>Sign in</Link>
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
