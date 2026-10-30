import {
  AnekKannada_400Regular,
  AnekKannada_500Medium,
  AnekKannada_600SemiBold,
  AnekKannada_700Bold,
  useFonts,
} from '@expo-google-fonts/anek-kannada';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from '@/lib/i18n';
import { SessionProvider, useSession } from '@/lib/session';
import { color, font } from '@/theme';

function Routes() {
  const { user, loading } = useSession();

  if (loading) {
    return (
      <View style={{ alignItems: 'center', backgroundColor: color.monsoonDeep, flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator color={color.mint} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: color.monsoonDeep },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: font.semibold },
        contentStyle: { backgroundColor: color.rain },
      }}
    >
      <Stack.Protected guard={Boolean(user)}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="report/new" options={{ title: 'Awaaz' }} />
        <Stack.Screen name="report/[id]" options={{ title: 'Awaaz' }} />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 3_000 } } }));
  const [fontsLoaded, fontError] = useFonts({
    AnekKannada_400Regular,
    AnekKannada_500Medium,
    AnekKannada_600SemiBold,
    AnekKannada_700Bold,
  });

  // A failed font load falls back to the system font, so it must not block the app.
  if (!fontsLoaded && !fontError) return <View style={{ backgroundColor: color.monsoonDeep, flex: 1 }} />;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <LanguageProvider>
            <StatusBar style="light" />
            <Routes />
          </LanguageProvider>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
