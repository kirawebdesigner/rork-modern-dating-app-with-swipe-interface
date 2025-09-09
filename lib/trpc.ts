import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import Constants from "expo-constants";
import { Platform } from "react-native";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const env = process.env as Record<string, string | undefined>;
  if (env.EXPO_PUBLIC_RORK_API_BASE_URL) return env.EXPO_PUBLIC_RORK_API_BASE_URL;

  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, any>;
  const fromExtra = extra.EXPO_PUBLIC_RORK_API_BASE_URL || extra.RORK_API_BASE_URL;
  if (fromExtra) return String(fromExtra);

  if (Platform.OS === 'web' && typeof location !== 'undefined') {
    return location.origin;
  }

  const hostUri = (Constants as any)?.expoGo?.hostUri as string | undefined;
  if (hostUri) {
    const sanitized = hostUri.startsWith('http') ? hostUri : `http://${hostUri}`;
    const url = new URL(sanitized);
    return `${url.protocol}//${url.host}`;
  }

  return 'http://localhost:3000';
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});