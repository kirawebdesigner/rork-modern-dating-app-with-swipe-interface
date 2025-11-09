# 🚨 IMPORTANT: Read This First!

## ⚡ Quick Start

To run your app with payments working:

### Option 1: Two Terminals (Recommended)

**Terminal 1:**
```bash
bun backend/hono.ts
```

**Terminal 2:**
```bash
bun start
```

### Option 2: One Command

```bash
./start-all.sh
```

---

## 🔍 Check If Everything Is OK

Run the health check:

```bash
chmod +x check-health.sh
./check-health.sh
```

✅ If all checks pass, you're good to go!

---

## ❌ Common Error

If you see:
```
TRPCClientError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

**This means:** Backend is not running!

**Fix:** Run `bun backend/hono.ts` in a separate terminal

---

## 📚 Detailed Guides

- **[START_BACKEND.md](./START_BACKEND.md)** - How to start the backend
- **[BACKEND_MUST_RUN.md](./BACKEND_MUST_RUN.md)** - Comprehensive troubleshooting
- **[PAYMENT_INTEGRATION_FIXED_FINAL.md](./PAYMENT_INTEGRATION_FIXED_FINAL.md)** - What was fixed

---

## 🎯 Quick Verification

1. Open http://localhost:8081/health in your browser
2. You should see JSON with `"status": "ok"`
3. If not, backend is not running!

---

## 🔧 Environment Setup

Make sure your `.env` file contains:

```env
ARIFPAY_API_KEY=hxsMUuBvV4j3ONdDif4SRSo2cKPrMoWY
ARIFPAY_BASE_URL=https://gateway.arifpay.net
ARIFPAY_ACCOUNT_NUMBER=01320811436100
EXPO_PUBLIC_API_URL=http://localhost:8081
```

---

## 💡 Remember

**The backend MUST be running for payments to work!**

Backend provides:
- tRPC API endpoints
- ArifPay payment integration
- Webhook handling
- Database operations

**Always start backend before frontend!**
