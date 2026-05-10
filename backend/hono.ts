import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router.ts";
import { createContext } from "./trpc/create-context.ts";
import webhooks from "./hono-webhooks.ts";
import { serve } from "@hono/node-server";

const app = new Hono();

console.log("[Hono] Initializing server...");
console.log("[Hono] Environment:", {
  hasArifpayKey: !!process.env.ARIFPAY_API_KEY,
  arifpayBaseUrl: process.env.ARIFPAY_BASE_URL,
});

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(s => s.trim())
  : ["http://localhost:8081", "http://localhost:19006", "https://zewijuna.com", "https://api.zewijuna.com"];

app.use("*", cors({
  origin: (origin) => {
    if (!origin) return ALLOWED_ORIGINS[0]; // Allow server-to-server (no origin header)
    return ALLOWED_ORIGINS.includes(origin) ? origin : null; // Block unauthorized origins
  },
  allowHeaders: ["Content-Type", "Authorization", "Accept"],
  allowMethods: ["POST", "GET", "OPTIONS"],
  credentials: true,
}));

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 300; // Max requests per window
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window

app.use("*", async (c, next) => {
  const ip = c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || "unknown";
  
  if (ip !== "unknown") {
    const now = Date.now();
    let record = rateLimitMap.get(ip);
    
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    }
    
    record.count++;
    rateLimitMap.set(ip, record);
    
    if (record.count > RATE_LIMIT_MAX) {
      console.warn(`[RateLimit] ⚠️ Blocking IP ${ip}. Requests: ${record.count}`);
      return c.json({ error: "Too many requests. Please try again later." }, 429);
    }
  }

  console.log(`[Hono] ${c.req.method} ${c.req.url}`);
  await next();
  console.log(`[Hono] Response status: ${c.res.status}`);
});

app.onError((err, c) => {
  console.error("[Hono] Error:", err);
  console.error("[Hono] Error stack:", err.stack);
  if (c.req.path.startsWith('/trpc') || c.req.path.startsWith('/api/trpc')) {
    console.log("[Hono] tRPC route error - letting tRPC handle it");
    throw err;
  }
  return c.json(
    {
      error: true,
      message: err.message || "Internal server error",
      timestamp: new Date().toISOString(),
      path: c.req.path,
    },
    500,
  );
});

app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
    onError({ error, type, path, input }) {
      console.error("[tRPC Server Error]", {
        type,
        path,
        error: error.message,
        stack: error.stack,
        input: JSON.stringify(input),
      });
    },
  }),
);

console.log("[Hono] tRPC server mounted at /trpc (full path: /api/trpc)");

app.route("/webhooks", webhooks);

app.get("/", (c) => {
  console.log("[Hono] Root endpoint accessed");
  return c.json({
    status: "ok",
    message: "API is running",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/health",
      trpc: "/api/trpc",
      webhooks: "/webhooks",
    },
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: {
      hasArifpayKey: !!process.env.ARIFPAY_API_KEY,
      arifpayBaseUrl: process.env.ARIFPAY_BASE_URL || "default",
    },
  });
});

// App logic ends here. 
const port = process.env.PORT || 8080;

try {
  serve({
    fetch: app.fetch,
    port: isNaN(Number(port)) ? port : Number(port)
  }, (info) => {
    console.log(`\n🚀 SERVER LIVE: ${info.port ?? port}`);
  });
} catch (e) {
  console.error("Failed to start server:", e);
}

export default app;
