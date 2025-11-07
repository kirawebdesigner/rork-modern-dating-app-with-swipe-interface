import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import webhooks from "./hono-webhooks";

const app = new Hono();

console.log('[Hono] Initializing server...');
console.log('[Hono] Environment:', {
  hasArifpayKey: !!process.env.ARIFPAY_API_KEY,
  arifpayBaseUrl: process.env.ARIFPAY_BASE_URL,
});

app.use("*", cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  credentials: true,
}));

app.use('*', async (c, next) => {
  console.log(`[Hono] ${c.req.method} ${c.req.url}`);
  await next();
  console.log(`[Hono] Response status: ${c.res.status}`);
});

app.onError((err, c) => {
  console.error('[Hono] Error:', err);
  console.error('[Hono] Error stack:', err.stack);
  
  return c.json({ 
    error: true,
    message: err.message || 'Internal server error',
    timestamp: new Date().toISOString(),
    path: c.req.path,
  }, 500);
});

app.use(
  "/api/trpc/*",
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
        input: JSON.stringify(input),
      });
    },
  })
);

console.log('[Hono] tRPC server mounted at /api/trpc');

app.route("/webhooks", webhooks);

app.get("/", (c) => {
  console.log('[Hono] Root endpoint accessed');
  return c.json({ 
    status: "ok", 
    message: "API is running",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      trpc: '/api/trpc',
      webhooks: '/webhooks'
    }
  });
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