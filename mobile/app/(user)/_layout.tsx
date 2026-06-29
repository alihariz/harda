// User-mode tab navigator: Map, Submit, My Reports, Profile.
// 'capture' and 'preview' are stack screens hosted off the Submit tab and not
// shown as tabs themselves.

import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { colors } from '@/lib/theme';

const Icon = ({ name, focused }: { name: string; focused: boolean }) => (
  <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.55 }}>{name}</Text>
);

export default function UserLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryAccent,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.map'), tabBarIcon: ({ focused }) => <Icon name="🗺️" focused={focused} /> }}
      />
      <Tabs.Screen
        name="capture"
        options={{ title: t('tabs.submit'), tabBarIcon: ({ focused }) => <Icon name="📷" focused={focused} /> }}
      />
      <Tabs.Screen
        name="my-reports"
        options={{ title: t('tabs.myReports'), tabBarIcon: ({ focused }) => <Icon name="📋" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: ({ focused }) => <Icon name="👤" focused={focused} /> }}
      />
      <Tabs.Screen name="preview" options={{ href: null }} />
    </Tabs>
  );
}
