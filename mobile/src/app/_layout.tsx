import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '../providers/ToastProvider';
import { DialogProvider } from '../providers/DialogProvider';
import { colors } from '../theme';

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '700', color: colors.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="leads/new" options={{ title: 'Add New Lead', presentation: 'modal' }} />
        <Stack.Screen name="leads/[id]/index" options={{ title: 'Lead Details' }} />
        <Stack.Screen name="leads/[id]/edit" options={{ title: 'Edit Lead' }} />
        <Stack.Screen name="invoices/new" options={{ title: 'Generate Invoice' }} />
        <Stack.Screen name="invoices/[id]" options={{ title: 'Invoice' }} />
        <Stack.Screen name="settings/company" options={{ title: 'Company Profile' }} />
        <Stack.Screen name="settings/billing" options={{ title: 'Invoice & Tax' }} />
        <Stack.Screen name="settings/bank" options={{ title: 'Bank & Terms' }} />
        <Stack.Screen name="settings/backup" options={{ title: 'Backup & Restore' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Data is local, so failures are real errors (e.g. not found); don't retry them.
            retry: false,
          },
        },
      }),
  );

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <DialogProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </DialogProvider>
        </ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
