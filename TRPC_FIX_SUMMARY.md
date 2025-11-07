# tRPC Error Fix Summary

## Problem
You were getting this error:
```
TRPCClientError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

This error means your frontend was expecting JSON from the backend, but instead received an HTML page.

## Root Cause
The backend server might not be running or accessible. When the tRPC client tries to connect to `/api/trpc`, it either gets:
1. A 404 HTML error page
2. An HTML redirect page
3. No response at all (connection refused)

## Fixes Applied

### 1. Enhanced Backend Error Handling (`backend/hono.ts`)
- ✅ Added proper JSON error responses (no more HTML)
- ✅ Added request/response logging
- ✅ Added CORS with Accept header support
- ✅ Enhanced error handler to always return JSON
- ✅ Added startup logs to verify server initialization

### 2. Improved tRPC Client (`lib/trpc.ts`)
- ✅ Added better error detection for HTML responses
- ✅ Added `Accept: application/json` header to all requests
- ✅ Added detailed error messages for debugging
- ✅ Added connection test helper (for future use)
- ✅ Better error messages that explain the issue

### 3. Enhanced Frontend Error Handling (`app/premium.tsx`)
- ✅ Already has comprehensive error handling
- ✅ Detects backend unavailability
- ✅ Shows user-friendly error messages
- ✅ Offers retry option

## How to Test

### Step 1: Verify Backend is Running
The backend should start automatically with the Rork CLI. Check your terminal for:
```
[Hono] Initializing server...
[Hono] tRPC server mounted at /api/trpc
```

### Step 2: Test Backend Health
Open in browser or use curl:
```bash
# Web
http://localhost:8081/health

# Should return:
{
  "status": "ok",
  "timestamp": "...",
  "env": {
    "hasArifpayKey": true,
    "arifpayBaseUrl": "https://gateway.arifpay.org/api/sandbox"
  }
}
```

### Step 3: Test tRPC Connection
Check browser console for:
```
[tRPC] Using base URL: http://localhost:8081 api: http://localhost:8081/api/trpc
[tRPC] Fetching: http://localhost:8081/api/trpc/...
[tRPC] Response status: 200
```

### Step 4: Test Payment Flow
1. Open the app
2. Go to Premium screen
3. Select a tier (Silver/Gold/VIP)
4. Choose payment method (CBE)
5. Click "Upgrade"
6. Watch console logs

## Expected Behavior

### Success Path
```
[Premium] Creating payment for tier: silver
[Premium] Phone: 251xxxxxxxxx
[Premium] Payment method: CBE
[tRPC] Fetching: http://localhost:8081/api/trpc/membership.upgrade
[Hono] POST http://localhost:8081/api/trpc/membership.upgrade
[tRPC Server] Processing membership.upgrade
[Arifpay] Creating CBE direct payment...
[Arifpay] Payment URL: https://checkout.arifpay.org/...
[Premium] Opening payment URL
✅ Payment window opened
```

### Error Path (Backend Down)
```
[Premium] Creating payment...
[tRPC] Fetching: http://localhost:8081/api/trpc/membership.upgrade
[tRPC] Network error: TypeError: fetch failed
❌ Alert: "Connection Error - Unable to connect to payment service"
```

## Troubleshooting

### Issue: "Backend not available"
**Solution:** Ensure Rork server is running:
```bash
bun start
# or
bunx rork start -p 01sqivqojn0aq61khqyvn --tunnel
```

### Issue: "Unexpected token '<'"
**Possible causes:**
1. Backend not running → Start the server
2. Wrong port → Check env: `EXPO_PUBLIC_API_URL=http://localhost:8081`
3. Firewall blocking → Check firewall settings
4. CORS issues → Already fixed in this update

### Issue: "Failed to fetch"
**Possible causes:**
1. Network connectivity → Check internet connection
2. Backend crashed → Check backend logs
3. Port already in use → Kill process on port 8081

## Testing Payment Integration

### Test Credentials (Sandbox)
```
Phone: 251954926213
Email: Test@gmail.com
```

### Test Flow
1. Create payment session
2. ArifPay returns payment URL
3. Open payment URL in browser/WebBrowser
4. Complete payment in CBE popup
5. ArifPay redirects to success URL
6. Webhook receives payment notification
7. Backend updates membership tier

## Environment Variables

Make sure these are set in your `.env`:
```bash
ARIFPAY_API_KEY=hxsMUuBvV4j3ONdDif4SRSo2cKPrMoWY
ARIFPAY_ACCOUNT_NUMBER=01320811436100
ARIFPAY_BASE_URL=https://gateway.arifpay.org/api/sandbox
EXPO_PUBLIC_API_URL=http://localhost:8081
```

## Next Steps

1. **Start the server** - Make sure Rork dev server is running
2. **Check logs** - Look for initialization messages
3. **Test health endpoint** - Verify backend is accessible
4. **Try payment** - Test the full flow
5. **Check console** - Monitor all logs for issues

## Architecture Overview

```
Frontend (React Native)
    ↓ tRPC Client
    ↓ HTTP Request
Backend (Hono + tRPC)
    ↓ membership.upgrade procedure
    ↓ arifpay.createPayment()
    ↓ HTTP Request
ArifPay API
    ↓ Returns payment URL
Frontend
    ↓ Opens payment URL
User completes payment
    ↓
ArifPay sends webhook
    ↓
Backend updates membership
```

## Files Modified

1. ✅ `lib/trpc.ts` - Enhanced error handling
2. ✅ `backend/hono.ts` - Improved server config
3. ✅ `app/premium.tsx` - Already had good error handling (no changes)

## Summary

The main issue was the backend not being accessible or returning HTML instead of JSON. The fixes ensure:

1. Backend always returns JSON (never HTML)
2. Better error messages for debugging
3. Clear feedback to users when backend is down
4. Proper CORS and headers configuration

**The backend must be running for the payment flow to work!**
