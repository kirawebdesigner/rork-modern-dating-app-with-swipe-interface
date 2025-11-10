const BACKEND_PORT = 8081;
const HEALTH_CHECK_INTERVAL = 30000;
const RESTART_DELAY = 5000;

async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${BACKEND_PORT}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function restartBackend() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔄 Backend Keep-Alive: Restarting...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const { spawn } = await import("bun");
  
  const proc = spawn({
    cmd: ["bun", "backend/hono.ts"],
    stdout: "inherit",
    stderr: "inherit",
    env: {
      ...process.env,
      PORT: String(BACKEND_PORT),
    },
  });

  await new Promise((resolve) => setTimeout(resolve, RESTART_DELAY));

  const healthy = await checkHealth();
  if (healthy) {
    console.log("✅ Backend restarted successfully\n");
  } else {
    console.error("❌ Backend restart failed\n");
    proc.kill();
  }

  return healthy;
}

async function keepAlive() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("❤️  Backend Keep-Alive Service Started");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 Checking backend health every", HEALTH_CHECK_INTERVAL / 1000, "seconds");
  console.log("🔄 Auto-restart on failure");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  let consecutiveFailures = 0;

  setInterval(async () => {
    const healthy = await checkHealth();

    if (healthy) {
      if (consecutiveFailures > 0) {
        console.log("✅ Backend recovered after", consecutiveFailures, "failed checks");
      }
      consecutiveFailures = 0;
    } else {
      consecutiveFailures++;
      console.warn(`⚠️  Backend health check failed (${consecutiveFailures})`);

      if (consecutiveFailures >= 2) {
        console.log("🔄 Attempting to restart backend...");
        const restarted = await restartBackend();
        
        if (restarted) {
          consecutiveFailures = 0;
        } else {
          console.error("❌ Could not restart backend. Manual intervention required.");
        }
      }
    }
  }, HEALTH_CHECK_INTERVAL);

  process.on("SIGINT", () => {
    console.log("\n👋 Keep-alive service shutting down...");
    process.exit(0);
  });
}

if (import.meta.main) {
  keepAlive();
}

export { keepAlive, checkHealth };
