import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import webhooks from "./hono-webhooks";

type BunModule = typeof import("bun");
type BunRuntime = Pick<BunModule, "serve">;
type BunServer = { stop: () => void };

type BunAwareGlobal = typeof globalThis & { Bun?: BunRuntime };
const bunRuntime = (globalThis as BunAwareGlobal).Bun;

const app = new Hono();

console.log("[Hono] Initializing server...");
console.log("[Hono] Environment:", {
  hasArifpayKey: !!process.env.ARIFPAY_API_KEY,
  arifpayBaseUrl: process.env.ARIFPAY_BASE_URL,
});

app.use("*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "Accept"],
  allowMethods: ["POST", "GET", "OPTIONS"],
  credentials: true,
}));

app.use("*", async (c, next) => {
  console.log(`[Hono] ${c.req.method} ${c.req.url}`);
  await next();
  console.log(`[Hono] Response status: ${c.res.status}`);
});

app.onError((err, c) => {
  console.error("[Hono] Error:", err);
  console.error("[Hono] Error stack:", err.stack);

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
  "/trpc/*",
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

const startBunServer = () => {
  if (!bunRuntime?.serve) {
    console.log("[Hono] Bun runtime not detected. Skipping embedded server start.");
    return;
  }

  const port = Number(process.env.PORT ?? 8081);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 Backend Server Starting");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📍 Port: ${port}`);
  console.log(`🔑 ArifPay API Key: ${process.env.ARIFPAY_API_KEY ? "✅ Set" : "❌ Missing"}`);
  console.log(`🏦 ArifPay Base URL: ${process.env.ARIFPAY_BASE_URL || "Using default"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    const server: BunServer = bunRuntime.serve({
      port,
      fetch: app.fetch,
      error(error: unknown) {
        console.error("[Bun Server Error]", error);
        return new Response("Internal Server Error", { status: 500 });
      },
    });

    console.log("\n✅ Backend server is running!");
    console.log(`🌐 URL: http://localhost:${port}`);
    console.log(`🔗 Health check: http://localhost:${port}/health`);
    console.log(`📡 tRPC endpoint: http://localhost:${port}/api/trpc`);
    console.log("\n💡 Tip: This server will auto-restart on file changes\n");

    const createShutdownHandler = (signal: string) => () => {
      console.log(`\n👋 Shutting down backend server (${signal})...`);
      server.stop();
      if (typeof process !== "undefined") {
        process.exit(0);
      }
    };

    if (typeof process !== "undefined" && process.on) {
      process.on("SIGINT", createShutdownHandler("SIGINT"));
      process.on("SIGTERM", createShutdownHandler("SIGTERM"));
    }
  } catch (error) {
    console.error("\n❌ Failed to start backend server:", error);
    if (typeof process !== "undefined") {
      process.exit(1);
    }
  }
};

startBunServer();

export default app;
