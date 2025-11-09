# ⚠️ BACKEND SERVER MUST BE RUNNING

## 🚨 The Problem

You're seeing this error:
```
[Premium] ❌ Payment Error
TRPCClientError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

**This means: THE BACKEND SERVER IS NOT RUNNING**

## ✅ The Solution

### Quick Start (Recommended)

**You need TWO terminal windows:**

#### Terminal 1 - Backend Server
```bash
cd /home/user/rork-app
bun backend/hono.ts
```

Keep this running! You should see:
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

#### Terminal 2 - Frontend App
```bash
cd /home/user/rork-app
bun start
```

---

### Alternative: One Command (Mac/Linux)

```bash
chmod +x start-all.sh
./start-all.sh
```

### Alternative: One Command (Windows)

```bash
start bun backend/hono.ts
timeout /t 3
bunx rork start -p 01sqivqojn0aq61khqyvn --tunnel
```

---

## 🧪 Verify Backend is Running

### Test 1: Check if server is alive
Open browser: http://localhost:8081/health

Expected response:
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

### Test 2: Check root endpoint
Open browser: http://localhost:8081/

Expected response:
```json
{
  "status": "ok",
  "message": "API is running",
  "endpoints": {
    "health": "/health",
    "trpc": "/api/trpc",
    "webhooks": "/webhooks"
  }
}
```

### Test 3: Console logs
In Terminal 1 (backend), you should see:
```
[Hono] GET http://localhost:8081/health
[Hono] Response status: 200
```

---

## 📋 Checklist

- [ ] Backend server is running (`bun backend/hono.ts`)
- [ ] Backend shows "✅ Backend server is running!" message
- [ ] Can access http://localhost:8081/health in browser
- [ ] `.env` file has correct `EXPO_PUBLIC_API_URL=http://localhost:8081`
- [ ] Frontend app is started (`bun start`)
- [ ] No firewall blocking port 8081

---

## 🔧 Troubleshooting

### Error: "Port 8081 already in use"

Kill the existing process:

**Mac/Linux:**
```bash
lsof -ti:8081 | xargs kill -9
```

**Windows:**
```bash
netstat -ano | findstr :8081
taskkill /PID <PID_NUMBER> /F
```

### Error: Still getting HTML response

1. **Restart both servers:**
   - Stop backend (Ctrl+C in Terminal 1)
   - Stop frontend (Ctrl+C in Terminal 2)
   - Start backend first
   - Wait 3 seconds
   - Start frontend

2. **Check environment variables:**
   ```bash
   cat .env
   ```
   Should contain:
   ```
   ARIFPAY_API_KEY=hxsMUuBvV4j3ONdDif4SRSo2cKPrMoWY
   ARIFPAY_BASE_URL=https://gateway.arifpay.net
   ARIFPAY_ACCOUNT_NUMBER=01320811436100
   EXPO_PUBLIC_API_URL=http://localhost:8081
   ```

3. **Clear cache and reload:**
   - In the Expo console, press `shift + r` to reload
   - Or restart the app completely

### Error: "Cannot connect to ArifPay"

This is a different error - it means:
- Backend IS running ✅
- But ArifPay API is not responding
- Check your internet connection
- Verify ArifPay credentials in `.env`
- Check if ArifPay service is online

---

## 📱 How Payment Flow Works

1. **User clicks "Upgrade"** in the app
2. **Frontend** → Makes tRPC call to → **Backend** (must be running!)
3. **Backend** → Makes API call to → **ArifPay** (external service)
4. **ArifPay** → Returns payment URL
5. **Backend** → Returns payment URL to **Frontend**
6. **Frontend** → Opens payment URL in browser
7. **User** → Completes payment on ArifPay website
8. **ArifPay** → Sends webhook to **Backend**
9. **Backend** → Updates membership in database
10. **User** → Membership upgraded! ✅

**Without the backend running, step 2 fails immediately!**

---

## 🎯 Expected Console Output

### When Everything Works:

**Frontend Console:**
```
[tRPC] 🚀 Client Configuration
[tRPC] Platform: web
[tRPC] Base URL: http://localhost:8081
[tRPC] API URL: /api/trpc

[tRPC] 📤 Request: /api/trpc/membership.upgrade
[tRPC] Method: POST
[tRPC] 📥 Response status: 200
[tRPC] ✅ Request successful

[Premium] Creating payment for tier: gold
[Premium] Phone: 251912345678
[Premium] Payment method: CBE
[Premium] Mutation result: {
  "success": true,
  "requiresPayment": true,
  "paymentUrl": "https://...",
  "sessionId": "...",
  "amount": 3200
}
[Premium] Opening payment URL: https://...
```

**Backend Console:**
```
[Hono] POST http://localhost:8081/api/trpc/membership.upgrade
[tRPC Upgrade] 🔄 Processing upgrade request
[tRPC Upgrade] User: phone-251912345678
[tRPC Upgrade] Tier: gold
[tRPC Upgrade] Amount: 3200 ETB
[Arifpay] Creating CBE direct payment...
[Arifpay] CBE Response status: 200
[tRPC Upgrade] ✅ Payment created successfully
[Hono] Response status: 200
```

---

## 📚 Additional Resources

- [ArifPay Integration Guide](./ARIFPAY_INTEGRATION_GUIDE.md)
- [Quick Start Guide](./QUICK_START.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

---

## 🆘 Still Having Issues?

1. Check all console logs carefully
2. Make sure BOTH terminals are running
3. Test the health endpoint
4. Verify .env configuration
5. Restart everything from scratch

**Most important: THE BACKEND MUST BE RUNNING!**
