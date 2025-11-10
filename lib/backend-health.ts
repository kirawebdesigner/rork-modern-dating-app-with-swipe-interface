import { Platform } from "react-native";

const BACKEND_PORT = 8081;
const HEALTH_CHECK_TIMEOUT = 5000;

export interface BackendHealthStatus {
  isHealthy: boolean;
  message: string;
  timestamp: number;
  env?: {
    hasArifpayKey: boolean;
    arifpayBaseUrl: string;
  };
}

export async function checkBackendHealth(): Promise<BackendHealthStatus> {
  const baseUrl = Platform.OS === "web" && typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`
    : `http://localhost:${BACKEND_PORT}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        isHealthy: true,
        message: "Backend is running",
        timestamp: Date.now(),
        env: data.env,
      };
    } else {
      return {
        isHealthy: false,
        message: `Backend responded with status ${response.status}`,
        timestamp: Date.now(),
      };
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          isHealthy: false,
          message: "Backend health check timed out",
          timestamp: Date.now(),
        };
      }
      return {
        isHealthy: false,
        message: `Cannot connect to backend: ${error.message}`,
        timestamp: Date.now(),
      };
    }
    return {
      isHealthy: false,
      message: "Unknown error checking backend health",
      timestamp: Date.now(),
    };
  }
}

export async function waitForBackend(
  maxAttempts: number = 10,
  delayMs: number = 2000
): Promise<boolean> {
  console.log("[BackendHealth] Waiting for backend to be ready...");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[BackendHealth] Attempt ${attempt}/${maxAttempts}...`);
    
    const status = await checkBackendHealth();
    
    if (status.isHealthy) {
      console.log("[BackendHealth] ✅ Backend is ready!");
      return true;
    }

    if (attempt < maxAttempts) {
      console.log(`[BackendHealth] ⏳ Waiting ${delayMs}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.error("[BackendHealth] ❌ Backend did not become ready");
  return false;
}

export function getBackendUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`;
  }
  return `http://localhost:${BACKEND_PORT}`;
}
