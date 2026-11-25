import { Tabs } from 'expo-router/tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (focused: IconName, idle: IconName) =>
  function TabIcon({ color, size, focused: isFocused }: { color: import("react-native").ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={isFocused ? focused : idle} size={size} color={color as string} />;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 64, paddingTop: 6, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: '700', color: colors.text, fontSize: 20 },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: icon('grid', 'grid-outline') }} />
      <Tabs.Screen name="leads" options={{ title: 'Leads', tabBarIcon: icon('people', 'people-outline') }} />
      <Tabs.Screen name="invoices" options={{ title: 'Invoices', tabBarIcon: icon('document-text', 'document-text-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings', 'settings-outline') }} />
    </Tabs>
  );
}
