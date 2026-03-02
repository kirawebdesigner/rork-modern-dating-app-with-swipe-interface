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
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000);
              const response = await fetch(input, {
                ...init,
                signal: controller.signal,
                headers: {
                  ...init?.headers,
                  'Content-Type': 'application/json',
                },
              });
              clearTimeout(timeoutId);
              
              if (!response.ok) {
                const text = await response.text();
                console.log('[tRPC] Non-OK response:', response.status, text.slice(0, 300));
                let errorBody: any;
                try {
                  errorBody = JSON.parse(text);
                } catch {
                  errorBody = {
                    error: {
                      message: text || `Server returned status ${response.status}`,
                      data: { code: 'INTERNAL_SERVER_ERROR' },
                    },
                  };
                }
                return new Response(JSON.stringify(errorBody), {
                  status: response.status,
                  headers: { 'Content-Type': 'application/json' },
                });
              }
              
              return response;
            } catch (error: any) {
              console.log('[tRPC] Fetch error (network may be unavailable):', error?.message || error);
              const msg = error?.name === 'AbortError'
                ? 'Request timed out. Please try again.'
                : 'Network unavailable. Please check your connection.';
              return new Response(
                JSON.stringify({
                  error: {
                    message: msg,
                    data: { code: 'INTERNAL_SERVER_ERROR' },
                  },
                }),
                {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' },
                },
              );
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
