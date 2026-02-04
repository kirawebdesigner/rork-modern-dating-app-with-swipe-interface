import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  
  if (!url) {
    console.error('[tRPC] EXPO_PUBLIC_RORK_API_BASE_URL is not set');
    throw new Error('EXPO_PUBLIC_RORK_API_BASE_URL is not configured');
  }
  
  const normalizedUrl = url.replace(/\/$/, '');
  console.log('[tRPC] Using API base URL:', normalizedUrl);
  return normalizedUrl;
};

const apiUrl = `${getBaseUrl()}/api/trpc`;
console.log('[tRPC] Full tRPC URL:', apiUrl);

export const trpcClient = trpc.createClient({
  links: [
    httpLink<AppRouter>({
      url: apiUrl,
      transformer: superjson,
      fetch: async (input, init) => {
        console.log('[tRPC] Request:', input);
        try {
          const response = await fetch(input, {
            ...init,
            headers: {
              ...init?.headers,
              'Content-Type': 'application/json',
            },
          });
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
