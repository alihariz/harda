// User-mode tab navigator: Map, Submit, My Reports, Profile.
// 'capture' and 'preview' are stack screens hosted off the Submit tab and not
// shown as tabs themselves.

import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { colors } from '@/lib/theme';

const Icon = ({ name, focused }: { name: string; focused: boolean }) => (
  <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.55 }}>{name}</Text>
);

export default function UserLayout() {
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
        options={{ title: 'Map', tabBarIcon: ({ focused }) => <Icon name="🗺️" focused={focused} /> }}
      />
      <Tabs.Screen
        name="capture"
        options={{ title: 'Submit', tabBarIcon: ({ focused }) => <Icon name="📷" focused={focused} /> }}
      />
      <Tabs.Screen
        name="my-reports"
        options={{ title: 'My Reports', tabBarIcon: ({ focused }) => <Icon name="📋" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ focused }) => <Icon name="👤" focused={focused} /> }}
      />
      <Tabs.Screen name="preview" options={{ href: null }} />
    </Tabs>
  );
}
