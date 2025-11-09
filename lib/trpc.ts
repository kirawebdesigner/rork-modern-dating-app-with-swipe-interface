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
    const backendPort = process.env.EXPO_PUBLIC_API_PORT || "8081";
    return `${url.protocol}//${url.hostname}:${backendPort}`;
  } catch (e) {
    console.log("[tRPC] Failed to parse hostUri, falling back:", hostLike, e);
    return "http://localhost:8081";
  }
};

const getBaseUrl = () => {
  const env = process.env as Record<string, string | undefined>;
  const envUrl = env.EXPO_PUBLIC_RORK_API_BASE_URL || env.EXPO_PUBLIC_API_URL;
  if (envUrl && !isPlaceholder(envUrl)) {
    console.log("[tRPC] ✅ Using env URL:", envUrl);
    return normalize(envUrl);
  }

  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, any>;
  const fromExtra =
    extra.EXPO_PUBLIC_RORK_API_BASE_URL ||
    extra.RORK_API_BASE_URL ||
    extra.EXPO_PUBLIC_API_URL ||
    extra.API_URL;
  if (fromExtra && !isPlaceholder(String(fromExtra))) {
    console.log("[tRPC] ✅ Using extra URL:", fromExtra);
    return normalize(String(fromExtra));
  }

  if (Platform.OS === "web" && typeof location !== "undefined") {
    try {
      const webUrl = new URL(location.origin);
      const bundlerPorts = new Set(["19000", "19001", "19002", "19006", "8081"]);
      const backendPort = process.env.EXPO_PUBLIC_API_PORT || "8081";
      if (bundlerPorts.has(webUrl.port)) {
        const derived = `${webUrl.protocol}//${webUrl.hostname}:${backendPort}`;
        console.log("[tRPC] 🌐 Derived backend from web origin:", derived);
        return normalize(derived);
      }
      console.log("[tRPC] 🌐 Using web origin:", location.origin);
      return normalize(location.origin);
    } catch (e) {
      console.log("[tRPC] Failed to parse web origin, using location.origin", e);
      return normalize(location.origin);
    }
  }

  const hostUri = (Constants as any)?.expoGo?.hostUri as string | undefined;
  if (hostUri) {
    const origin = toHttpOrigin(hostUri);
    console.log("[tRPC] 📱 Using Expo Go hostUri:", origin);
    return origin;
  }

  const isAndroid = Platform.OS === "android";
  const fallback = isAndroid ? "http://10.0.2.2:8081" : "http://localhost:8081";
  console.warn("[tRPC] ⚠️ Using fallback (backend may not be running):", fallback);
  return fallback;
};

const baseUrl = `${getBaseUrl()}`;
const apiUrl = `${baseUrl}/api/trpc`;
const webApiUrl = Platform.OS === "web" && typeof location !== "undefined"
  ? `${location.origin === baseUrl ? "" : baseUrl}/api/trpc`
  : apiUrl;

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("[tRPC] 🚀 Client Configuration");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("[tRPC] Platform:", Platform.OS);
console.log("[tRPC] Base URL:", baseUrl);
console.log("[tRPC] API URL:", Platform.OS === "web" ? webApiUrl : apiUrl);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

export const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    httpLink({
      url: Platform.OS === "web" ? webApiUrl : apiUrl,
      async fetch(url, options) {
        console.log("\n[tRPC] 📤 Request:", url);
        console.log("[tRPC] Method:", options?.method || 'GET');
        if (options?.body) {
          console.log("[tRPC] Body (first 200 chars):", String(options.body).substring(0, 200));
        }
        
        try {
          const res = await fetch(url, {
            ...options,
            headers: {
              ...options?.headers,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          });
          
          console.log("[tRPC] 📥 Response status:", res.status);
          
          if (!res.ok) {
            const text = await res.clone().text();
            console.error("[tRPC] ❌ Error response:", text.substring(0, 500));
            
            if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
              console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
              console.error("[tRPC] ❌ BACKEND CONNECTION ERROR");
              console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
              console.error("[tRPC] URL attempted:", baseUrl);
              console.error("[tRPC] Full endpoint:", url);
              console.error("[tRPC] Response: HTML page (not API)");
              console.error("\n[tRPC] ⚠️ TROUBLESHOOTING:");
              console.error("[tRPC] 1. Is the backend server running?");
              console.error("[tRPC]    Run: bun backend/hono.ts");
              console.error("[tRPC] 2. Check EXPO_PUBLIC_API_URL in .env");
              console.error("[tRPC]    Current: " + (process.env.EXPO_PUBLIC_API_URL || 'not set'));
              console.error("[tRPC] 3. Verify the backend is on port 8081");
              console.error("[tRPC] 4. Test: curl " + baseUrl + "/health");
              console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
              
              throw new Error(
                `Backend server not responding at ${baseUrl}\n\n` +
                `Please ensure the backend is running:\n` +
                `  1. Open a terminal\n` +
                `  2. Run: bun backend/hono.ts\n` +
                `  3. Verify it starts on port 8081\n\n` +
                `Current API URL: ${baseUrl}`
              );
            }
          } else {
            console.log("[tRPC] ✅ Request successful");
          }
          
          return res;
        } catch (err) {
          console.error("\n[tRPC] ❌ Network error:", err);
          
          if (err instanceof Error && err.message.includes('Backend server not responding')) {
            throw err;
          }
          
          if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('Network'))) {
            console.error("[tRPC] ⚠️ Cannot connect to:", baseUrl);
            throw new Error(
              `Cannot connect to backend server\n\n` +
              `Attempted URL: ${baseUrl}\n\n` +
              `Possible causes:\n` +
              `  1. Backend server is not running\n` +
              `  2. Wrong URL in .env file\n` +
              `  3. Network/firewall blocking connection\n\n` +
              `To fix: Run 'bun backend/hono.ts' in terminal`
            );
          }
          
          throw err;
        }
      },
    }),
  ],
});
