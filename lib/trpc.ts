import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import Constants from 'expo-constants';

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const env = process.env as Record<string, string | undefined>;
  const extra = (Constants.expoConfig?.extra as Record<string, any> | undefined) ?? {};
  
  const url = 
    env.EXPO_PUBLIC_RORK_API_BASE_URL ?? 
    extra.EXPO_PUBLIC_RORK_API_BASE_URL ??
    'https://rork.com';
  
  const normalizedUrl = url.replace(/\/$/, '');
  console.log('[tRPC] Using API base URL:', normalizedUrl);
  return normalizedUrl;
};

const createTrpcClient = () => {
  let apiUrl: string;
  try {
    apiUrl = `${getBaseUrl()}/api/trpc`;
    console.log('[tRPC] Full tRPC URL:', apiUrl);
  } catch (error) {
    console.error('[tRPC] Failed to get base URL, using fallback:', error);
    apiUrl = 'https://rork.com/api/trpc';
    console.log('[tRPC] Using fallback URL:', apiUrl);
  }

  try {
    return trpc.createClient({
      links: [
        httpLink<AppRouter>({
          url: apiUrl,
          transformer: superjson,
          fetch: async (input, init) => {
            try {
              const response = await fetch(input, {
                ...init,
                headers: {
                  ...init?.headers,
                  'Content-Type': 'application/json',
                },
              });
              return response;
            } catch (error) {
              console.error('[tRPC] Fetch error:', error);
              throw error;
            }
          },
        }),
      ],
    });
  } catch (error) {
    console.error('[tRPC] Failed to create client:', error);
    // Return a minimal client that won't crash
    return trpc.createClient({
      links: [
        httpLink<AppRouter>({
          url: 'https://rork.com/api/trpc',
          transformer: superjson,
        }),
      ],
    });
  }
};

export const trpcClient = createTrpcClient();
