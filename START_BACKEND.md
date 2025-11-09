# 🚀 Starting the Backend Server

## The Issue

The error `TRPCClientError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON"` means:
- The frontend is trying to connect to the backend API
- But the backend server is **not running**
- So it's getting an HTML error page instead of JSON

## Solution: Start the Backend

### Step 1: Open a New Terminal

You need to run the backend server in a **separate terminal** from your Expo app.

### Step 2: Run the Backend

In the new terminal, run:

```bash
bun backend/hono.ts
```

You should see output like:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Backend Server Starting
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Port: 8081
🔑 ArifPay API Key: ✅ Set
🏦 ArifPay Base URL: https://gateway.arifpay.net
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Backend server is running!
🌐 URL: http://localhost:8081
🔗 Health check: http://localhost:8081/health
📡 tRPC endpoint: http://localhost:8081/api/trpc
```

### Step 3: Test the Backend

Open a browser and visit: http://localhost:8081/health

You should see a JSON response like:
```json
{
  "status": "ok",
  "timestamp": "2025-01-09T...",
  "env": {
    "hasArifpayKey": true,
    "arifpayBaseUrl": "https://gateway.arifpay.net"
  }
}
```

### Step 4: Now Test Your App

With the backend running, try the premium upgrade again. It should work!

## Running Both at Once

To run both the backend and frontend together in one command:

```bash
bun backend/hono.ts & bun start
```

Or on Windows:
```bash
start bun backend/hono.ts
bun start
```

## Troubleshooting

### Port Already in Use

If you see "port already in use", kill the process:

```bash
# Mac/Linux
lsof -ti:8081 | xargs kill -9

# Windows
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

### ArifPay Errors

Make sure your `.env` file has:
```
ARIFPAY_API_KEY=hxsMUuBvV4j3ONdDif4SRSo2cKPrMoWY
ARIFPAY_BASE_URL=https://gateway.arifpay.net
ARIFPAY_ACCOUNT_NUMBER=01320811436100
```

### Still Getting HTML Errors?

1. Check that the backend is actually running (visit http://localhost:8081)
2. Check your `EXPO_PUBLIC_API_URL` in `.env` is set to `http://localhost:8081`
3. Restart both the backend and frontend
4. Clear the app cache and reload
