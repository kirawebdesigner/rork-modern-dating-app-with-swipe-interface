import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/hooks/auth-context";
import { AppProvider } from "@/hooks/app-context";
import { MembershipProvider } from "@/hooks/membership-context";
import { I18nProvider } from "@/hooks/i18n-context";
import { ThemeProvider } from "@/hooks/theme-context";
import { Platform, View, Text, ActivityIndicator, StyleSheet } from "react-native";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import { trpc, trpcClient } from "@/lib/trpc";
import { registerForPushNotificationsAsync, setupNotificationHandlers, savePushTokenToServer } from "@/lib/notifications";
import UpdateChecker from "@/components/UpdateChecker";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 1000,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 0,
      networkMode: 'offlineFirst',
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack initialRouteName="onboarding" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="permissions/contacts" />
      <Stack.Screen name="permissions/notifications" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="premium" options={{ presentation: "modal" }} />
      <Stack.Screen name="profile-settings" />
      
      <Stack.Screen name="discovery-filters" />
      <Stack.Screen name="referrals" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="privacy-policy" />
      <Stack.Screen name="permissions-info" />
    </Stack>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{this.state.error?.message || 'Unknown error'}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        console.log('[RootLayout] Initializing...');
        
        const already = await AsyncStorage.getItem('referrer_code');
        if (!already) {
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
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        registerForPushNotificationsAsync().then(async (token) => {
          console.log('[RootLayout] Push token:', token);
          const uid = await AsyncStorage.getItem('user_id');
          if (uid && token) {
            await savePushTokenToServer(uid);
          }
        }).catch(e => console.log('[RootLayout] Push setup error', e));

        setupNotificationHandlers().then(cleanup => {
          console.log('[RootLayout] Notification handlers set up');
        }).catch(e => console.log('[RootLayout] Notification handlers error', e));

        if (mounted) {
          setIsReady(true);
          await SplashScreen.hideAsync();
        }
      } catch (e) {
        console.error('[RootLayout] Init failed:', e);
        if (mounted) {
          setIsReady(true);
          await SplashScreen.hideAsync().catch(() => {});
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  try {
    return (
      <ErrorBoundary>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <AuthProvider>
                <AppProvider>
                  <MembershipProvider>
                    <I18nProvider>
                      <ThemeProvider>
                        <RootLayoutNav />
                        <UpdateChecker />
                      </ThemeProvider>
                    </I18nProvider>
                  </MembershipProvider>
                </AppProvider>
              </AuthProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </trpc.Provider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('[RootLayout] Failed to render:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Failed to start app</Text>
        <Text style={styles.errorText}>{error instanceof Error ? error.message : 'Unknown error'}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});