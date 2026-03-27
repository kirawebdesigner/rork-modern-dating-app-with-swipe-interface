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
    'https://api.zewijuna.com';

  const normalizedUrl = url.replace(/\/$/, '');
  console.log('[tRPC] Using API base URL:', normalizedUrl);
  return normalizedUrl;
};

const buildSuperjsonErrorResponse = (message: string, httpStatus: number): Response => {
  // tRPC expects the response envelope to have { error: <superjson-serialized-error> }
  // The error object itself is serialized with superjson, NOT the whole envelope
  const errorObject = {
    message,
    code: -32603,
    data: {
      code: 'INTERNAL_SERVER_ERROR',
      httpStatus,
    },
  };
  const serializedError = superjson.serialize(errorObject);
  const responseBody = {
    error: serializedError,
  };
  return new Response(
    JSON.stringify(responseBody),
    {
      status: httpStatus,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};

const createTrpcClient = () => {
  let apiUrl: string;
  try {
    const baseUrl = getBaseUrl();
    apiUrl = `${baseUrl}/api/trpc`;
    console.log('[tRPC] Full tRPC URL:', apiUrl);
  } catch (error) {
    console.error('[tRPC] Failed to get base URL, using fallback:', error);
    // Use the project-specific domain from route.ts as a better fallback
    apiUrl = 'https://api.zewijuna.com/api/trpc';
    console.log('[tRPC] Using fallback URL:', apiUrl);
  }

  try {
    return trpc.createClient({
      links: [
        httpLink<AppRouter>({
          url: apiUrl,
          transformer: superjson,
          fetch: async (input, init) => {
            const urlString = input.toString();
            console.log(`[tRPC Request] ${init?.method || 'GET'} ${urlString}`);

            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s to account for slow ArifPay
              const response = await fetch(input, {
                ...init,
                signal: controller.signal,
                headers: {
                  ...init?.headers,
                  'Content-Type': 'application/json',
                },
              });
              clearTimeout(timeoutId);

              console.log(`[tRPC Response] Status: ${response.status} ${response.statusText}`);
              const text = await response.text();

              // Log a snippet of the response body for debugging
              const preview = text.length > 500 ? text.slice(0, 500) + '...' : text;
              console.log('[tRPC Response Body Preview]:', preview);

              if (!response.ok) {
                // Check if response is valid JSON
                let parsed: any = null;
                try {
                  parsed = JSON.parse(text);
                } catch {
                  // Not JSON at all - wrap it
                  console.log('[tRPC] Non-JSON error response, wrapping as tRPC error');
                  return buildSuperjsonErrorResponse(
                    `Server Error (${response.status}): ${text.slice(0, 100)}`,
                    response.status,
                  );
                }

                // Check if it's already a valid tRPC error response (server-side tRPC errors)
                // tRPC+superjson format: { error: { json: {...}, meta: {...} } }
                // tRPC without transformer: { error: { message: "...", code: ... } }
                if (parsed.error && (typeof parsed.error === 'object')) {
                  // It's a valid tRPC error envelope, pass through as-is
                  return new Response(text, {
                    status: response.status,
                    headers: response.headers,
                  });
                }

                // JSON but not tRPC format - wrap it
                console.log('[tRPC] Non-tRPC JSON error response, wrapping as tRPC error');
                const msg = parsed.message || parsed.msg || parsed.error || `Server Error (${response.status})`;
                return buildSuperjsonErrorResponse(
                  String(msg).slice(0, 200),
                  response.status,
                );
              }

              // Even for 200 OK, verify it's JSON if we're on a non-tRPC environment (like placeholder HTML)
              if (text.trim().startsWith('<') || !text.includes('{')) {
                console.warn('[tRPC] Received non-JSON success response (likely HTML placeholder)');
                return buildSuperjsonErrorResponse(
                  `Invalid server response (HTML detected). Please check if the backend is running.`,
                  500,
                );
              }

              return new Response(text, {
                status: response.status,
                headers: response.headers,
              });
            } catch (error: any) {
              console.log('[tRPC] Fetch Error:', error?.message || error);
              const msg = error?.name === 'AbortError'
                ? 'Request timed out. Please try again.'
                : 'Network unavailable. Please check your connection.';
              return buildSuperjsonErrorResponse(msg, 503);
            }
          },
        }),
      ],
    });
  } catch (error) {
    console.error('[tRPC] Failed to create client:', error);
    return trpc.createClient({
      links: [
        httpLink<AppRouter>({
          url: 'https://api.zewijuna.com/api/trpc',
          transformer: superjson,
        }),
      ],
    });
  }
};

export const trpcClient = createTrpcClient();
