// Entry redirect. Routes to the right experience based on the auth state:
//   no token         → /(auth)/login
//   role=user        → /(user)
//   role=crew        → /(crew)
//
// Splash screen stays up until the auth hydration finishes.

import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { colors } from '@/lib/theme';

export default function Index() {
  const { ready, role } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (role === 'crew') return <Redirect href="/(crew)" />;
  if (role === 'user') return <Redirect href="/(user)" />;
  return <Redirect href="/(auth)/login" />;
}
