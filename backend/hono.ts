import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import webhooks from "./hono-webhooks";

const app = new Hono();

app.use("*", cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
}));

app.onError((err, c) => {
  console.error('[Hono] Error:', err);
  return c.json({ error: err.message }, 500);
});

app.use(
  "/api/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
    onError({ error, type, path, input, ctx, req }) {
      console.error('[tRPC Server Error]', {
        type,
        path,
        error: error.message,
        stack: error.stack,
      });
    },
  })
);

app.route("/webhooks", webhooks);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

app.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: {
      hasArifpayKey: !!process.env.ARIFPAY_API_KEY,
      arifpayBaseUrl: process.env.ARIFPAY_BASE_URL || 'default',
    }
  });
});

export default app;