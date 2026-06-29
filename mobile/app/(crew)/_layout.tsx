import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { colors } from '@/lib/theme';

const Icon = ({ name, focused }: { name: string; focused: boolean }) => (
  <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.55 }}>{name}</Text>
);

export default function CrewLayout() {
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
        options={{ title: t('tabs.inbox'), tabBarIcon: ({ focused }) => <Icon name="📥" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.crewProfile'), tabBarIcon: ({ focused }) => <Icon name="👤" focused={focused} /> }}
      />
      <Tabs.Screen name="assignment/[id]" options={{ href: null }} />
      <Tabs.Screen name="resolve/[id]" options={{ href: null }} />
    </Tabs>
  );
}
