import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/hooks/auth-context";
import { AppProvider } from "@/hooks/app-context";
import { MembershipProvider } from "@/hooks/membership-context";
import { I18nProvider } from "@/hooks/i18n-context";
import { trpc, trpcClient } from "@/lib/trpc";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="permissions/contacts" />
      <Stack.Screen name="permissions/notifications" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="premium" options={{ presentation: "modal" }} />
      <Stack.Screen name="profile-settings" />
      <Stack.Screen name="credits" options={{ presentation: "modal" }} />
      <Stack.Screen name="discovery-filters" />
      <Stack.Screen name="referrals" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    (async () => {
      try {
        const already = await AsyncStorage.getItem('referrer_code');
        if (already) return;
        if (Platform.OS === 'web') {
          const params = new URLSearchParams(window.location.search);
          const ref = params.get('ref');
          if (ref) await AsyncStorage.setItem('referrer_code', ref);
        } else {
          const url = await Linking.getInitialURL();
          if (url) {
            const { queryParams } = Linking.parse(url);
            const ref = (queryParams?.ref as string | undefined) ?? null;
            if (ref) await AsyncStorage.setItem('referrer_code', ref);
          }
        }
      } catch (e) {
        console.log('[RootLayout] ref parse failed', e);
      }
    })();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <AppProvider>
              <MembershipProvider>
                <I18nProvider>
                  <RootLayoutNav />
                </I18nProvider>
              </MembershipProvider>
            </AppProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}