import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import Constants from "expo-constants";
import { Platform } from "react-native";

export const trpc = createTRPCReact<AppRouter>();

const normalize = (base: string) => base.replace(/\/$/, "");

const getBaseUrl = () => {
  // Priority 1: Explicit API URL from environment
  const rorkApiUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (rorkApiUrl && rorkApiUrl.trim().length > 0) {
    console.log('[tRPC] Using RORK API URL:', rorkApiUrl);
    return normalize(rorkApiUrl.trim());
  }

  const envUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();
  if (envUrl.length > 0) {
    console.log('[tRPC] Using API URL from env:', envUrl);
    return normalize(envUrl);
  }

  // Priority 2: Web - use current origin
  if (Platform.OS === "web" && typeof location !== "undefined") {
    try {
      console.log('[tRPC] Web platform, using location origin:', location.origin);
      return normalize(location.origin);
    } catch {
      console.log('[tRPC] Failed to get location origin');
    }
  }

  // Priority 3: Expo Go host
  const hostUri = (Constants as any)?.expoGo?.hostUri as string | undefined;
  if (hostUri) {
    try {
      const raw = hostUri.trim();
      const withoutScheme = raw.includes("://") ? raw.split("://")[1] : raw;
      const justHost = withoutScheme.replace(/^exp\+?\w*:\/\//, "");
      
      if (!justHost.includes(':') && justHost.includes('.')) {
        const url = `https://${justHost}`;
        console.log('[tRPC] Using Expo Go host (tunnel):', url);
        return url;
      }

      const url = new URL(`http://${justHost}`);
      const port = url.port || "8081";
      const result = `${url.protocol}//${url.hostname}:${port}`;
      console.log('[tRPC] Using Expo Go host:', result);
      return result;
    } catch {
      console.log('[tRPC] Failed to parse Expo Go host');
    }
  }

  // Priority 4: Fallback
  const isAndroid = Platform.OS === "android";
  const fallback = isAndroid ? "http://10.0.2.2:8081" : "http://localhost:8081";
  console.log('[tRPC] Using fallback URL:', fallback);
  return fallback;
};

const baseUrl = getBaseUrl();
const apiUrl = `${baseUrl}/api/trpc`;
console.log('[tRPC] Final API URL:', apiUrl);

export const trpcClient = trpc.createClient({
  links: [
    httpLink<AppRouter>({
      url: apiUrl,
      transformer: superjson,
      fetch: async (input, init) => {
        console.log('[tRPC] Fetching:', input);
        try {
          const response = await fetch(input, init);
          console.log('[tRPC] Response status:', response.status);
          return response;
        } catch (error) {
          console.error('[tRPC] Fetch error:', error);
          throw error;
        }
      },
    }),
  ],
});
