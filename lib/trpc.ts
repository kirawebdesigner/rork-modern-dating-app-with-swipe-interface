import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import Constants from "expo-constants";
import { Platform } from "react-native";

export const trpc = createTRPCReact<AppRouter>();

const normalize = (base: string) => base.replace(/\/$/, "");

const toHttpOrigin = (hostLike: string) => {
  try {
    const raw = hostLike.trim();
    const withoutScheme = raw.includes("://") ? raw.split("://")[1] : raw;
    const justHost = withoutScheme.replace(/^exp\+?\w*:\/\//, "");
    const url = new URL(`http://${justHost}`);
    const backendPort = "8081";
    return `${url.protocol}//${url.hostname}:${backendPort}`;
  } catch {
    return "http://localhost:8081";
  }
};

const getBaseUrl = () => {
  if (Platform.OS === "web" && typeof location !== "undefined") {
    try {
      const webUrl = new URL(location.origin);
      const bundlerPorts = new Set(["19000", "19001", "19002", "19006", "8081"]);
      if (bundlerPorts.has(webUrl.port)) {
        return normalize(`${webUrl.protocol}//${webUrl.hostname}:8081`);
      }
      return normalize(location.origin);
    } catch {
      return normalize(location.origin);
    }
  }

  const hostUri = (Constants as any)?.expoGo?.hostUri as string | undefined;
  if (hostUri) {
    return toHttpOrigin(hostUri);
  }

  const isAndroid = Platform.OS === "android";
  return isAndroid ? "http://10.0.2.2:8081" : "http://localhost:8081";
};

const baseUrl = getBaseUrl();
const apiUrl = `${baseUrl}/api/trpc`;

export const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    httpLink({
      url: apiUrl,
      fetch,
    }),
  ],
});
