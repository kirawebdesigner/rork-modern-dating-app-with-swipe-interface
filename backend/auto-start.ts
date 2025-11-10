import { spawn } from "bun";

const BACKEND_PORT = 8081;
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000;

async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${BACKEND_PORT}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function startBackend() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 Backend Auto-Start Service");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const isRunning = await checkBackendHealth();
  if (isRunning) {
    console.log("✅ Backend is already running on port", BACKEND_PORT);
    console.log("🌐 Health check: http://localhost:" + BACKEND_PORT + "/health");
    return true;
  }

  console.log("⏳ Starting backend server...");

  const proc = spawn({
    cmd: ["bun", "backend/hono.ts"],
    stdout: "inherit",
    stderr: "inherit",
    env: {
      ...process.env,
      PORT: String(BACKEND_PORT),
    },
  });

  for (let i = 0; i < MAX_RETRIES; i++) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    
    const healthy = await checkBackendHealth();
    if (healthy) {
      console.log("\n✅ Backend started successfully!");
      console.log("🌐 Server: http://localhost:" + BACKEND_PORT);
      console.log("🔗 Health: http://localhost:" + BACKEND_PORT + "/health");
      console.log("📡 tRPC: http://localhost:" + BACKEND_PORT + "/api/trpc\n");
      return true;
    }
    
    console.log(`⏳ Waiting for backend... (${i + 1}/${MAX_RETRIES})`);
  }

  console.error("\n❌ Failed to start backend after", MAX_RETRIES, "attempts");
  console.error("Please check the logs above for errors\n");
  proc.kill();
  return false;
}

if (import.meta.main) {
  const success = await startBackend();
  process.exit(success ? 0 : 1);
}

export { startBackend, checkBackendHealth };
