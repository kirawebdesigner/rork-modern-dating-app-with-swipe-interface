import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import Constants from "expo-constants";
import { Platform } from "react-native";

export const trpc = createTRPCReact<AppRouter>();

const isPlaceholder = (url: string | undefined) => {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname.includes("your-app.com");
  } catch {
    return url.includes("your-app.com");
  }
};

const normalize = (base: string) => base.replace(/\/$/, "");

const toHttpOrigin = (hostLike: string) => {
  try {
    const raw = hostLike.trim();
    const withoutScheme = raw.includes("://") ? raw.split("://")[1] : raw;
    const justHost = withoutScheme.replace(/^exp\+?\w*:\/\//, "");
    const url = new URL(`http://${justHost}`);
    return `${url.protocol}//${url.host}`;
  } catch (e) {
    console.log("[tRPC] Failed to parse hostUri, falling back:", hostLike, e);
    return "http://localhost:3000";
  }
};

const getBaseUrl = () => {
  const env = process.env as Record<string, string | undefined>;
  const envUrl = env.EXPO_PUBLIC_RORK_API_BASE_URL || env.EXPO_PUBLIC_API_URL;
  if (envUrl && !isPlaceholder(envUrl)) {
    console.log("[tRPC] Using env URL:", envUrl);
    return normalize(envUrl);
  }

  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, any>;
  const fromExtra =
    extra.EXPO_PUBLIC_RORK_API_BASE_URL ||
    extra.RORK_API_BASE_URL ||
    extra.EXPO_PUBLIC_API_URL ||
    extra.API_URL;
  if (fromExtra && !isPlaceholder(String(fromExtra))) {
    console.log("[tRPC] Using extra URL:", fromExtra);
    return normalize(String(fromExtra));
  }

  if (Platform.OS === "web" && typeof location !== "undefined") {
    console.log("[tRPC] Using web origin:", location.origin);
    return normalize(location.origin);
  }

  const hostUri = (Constants as any)?.expoGo?.hostUri as string | undefined;
  if (hostUri) {
    const origin = toHttpOrigin(hostUri);
    console.log("[tRPC] Using Expo Go hostUri:", origin);
    return origin;
  }

  const isAndroid = Platform.OS === "android";
  const fallback = isAndroid ? "http://10.0.2.2:8081" : "http://localhost:8081";
  console.log("[tRPC] Using fallback:", fallback);
  return fallback;
};

const baseUrl = `${getBaseUrl()}`;
const apiUrl = Platform.OS === "web" ? "/api/trpc" : `${baseUrl}/api/trpc`;
console.log("[tRPC] Using base URL:", baseUrl, "api:", apiUrl);

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: apiUrl,
      transformer: superjson,
      async fetch(url, options) {
        console.log("[tRPC] Fetching:", url);
        console.log("[tRPC] Request body:", options?.body);
        
        try {
          const res = await fetch(url, {
            ...options,
            headers: {
              ...options?.headers,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          });
          
          console.log("[tRPC] Response status:", res.status);
          console.log("[tRPC] Response headers:", JSON.stringify(Object.fromEntries(res.headers.entries())));
          
          if (!res.ok) {
            const text = await res.clone().text();
            console.error("[tRPC] Fetch error:", res.status, text.substring(0, 500));
            
            if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
              const errorMsg = `❌ Backend not available\n\nThe server is not responding at ${baseUrl}.\n\nPlease ensure:\n1. The Rork server is running\n2. The backend port (8081) is accessible\n3. Check firewall/network settings`;
              throw new Error(errorMsg);
            }
          }
          
          return res;
        } catch (err) {
          console.error("[tRPC] Network error:", err);
          
          if (err instanceof TypeError && err.message.includes('fetch')) {
            throw new Error(`Cannot connect to backend server at ${baseUrl}. Please check if the server is running.`);
          }
          
          throw err;
        }
      },
    }),
  ],
});
