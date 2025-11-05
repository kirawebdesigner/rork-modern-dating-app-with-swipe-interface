# tRPC Error Fix Summary

## Problem
The app was showing this error:
```
[Premium] handleUpgrade error: TRPCClientError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

This error occurs when the tRPC client receives an HTML response instead of JSON, typically indicating:
1. **Backend server not running** - The most common cause
2. **Incorrect endpoint configuration** - Wrong API URL
3. **Server routing issues** - tRPC routes not properly registered

## What Was Fixed

### 1. Backend Error Handling (`backend/hono.ts`)
- ✅ Improved global error handler to always return JSON
- ✅ Fixed tRPC middleware path from `/api/*` to `/api/trpc/*`
- ✅ Added proper error response structure

### 2. Backend Route Error Handling (`backend/trpc/routes/membership/upgrade/route.ts`)
- ✅ Added detection for HTML responses in errors
- ✅ Improved error messages for connection issues
- ✅ Better handling of ArifPay API failures

### 3. Frontend Error Detection (`lib/trpc.ts`)
- ✅ Added HTML detection in responses
- ✅ Better logging for debugging
- ✅ User-friendly error messages

### 4. UI Error Messages (`app/premium.tsx`)
- ✅ Specific error handling for server unavailability
- ✅ Clear user guidance when backend is not running
- ✅ Retry functionality for transient errors

## How to Verify the Fix

### 1. Start the Development Server
```bash
bun run start
```

The Rork CLI automatically starts both frontend and backend servers.

### 2. Check Backend Health
Visit in your browser or use curl:
```bash
curl http://localhost:8081/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-31T...",
  "env": {
    "hasArifpayKey": true,
    "arifpayBaseUrl": "https://gateway.arifpay.org/api/sandbox"
  }
}
```

### 3. Test the Payment Flow
1. Open the app and navigate to Premium screen
2. Select a tier (Silver, Gold, or VIP)
3. Select payment method (CBE, TeleBirr, or Amole)
4. Click "Upgrade to [Tier]"
5. **If backend is running:** Payment URL should open
6. **If backend is NOT running:** Clear error message with retry option

## Error Messages You'll Now See

### Before (Confusing)
```
TRPCClientError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

### After (Clear and Actionable)
```
Server Error

The payment server is currently unavailable. This may be because:

1. The backend server is not running
2. The server is restarting

Please wait a moment and try again, or contact support if the issue persists.

[OK] [Retry]
```

## Common Issues and Solutions

### Issue: "Backend server is not responding correctly"
**Cause:** Backend server is not running
**Solution:** 
1. Make sure you're running `bun run start` (not just the frontend)
2. Wait for the server to fully start (check terminal output)
3. Verify backend is accessible at `http://localhost:8081/health`

### Issue: "Failed to fetch"
**Cause:** Network connectivity or CORS issues
**Solution:**
1. Check your internet connection
2. Verify firewall settings
3. On mobile, ensure you're using the correct local IP (not localhost)

### Issue: Payment doesn't redirect
**Cause:** ArifPay API issue or invalid API key
**Solution:**
1. Check ArifPay API key in `.env` file
2. Verify phone number format (must start with 251)
3. Check ArifPay sandbox status

## Environment Variables

Make sure these are set in your `.env` file:
```env
ARIFPAY_API_KEY=your_api_key_here
ARIFPAY_ACCOUNT_NUMBER=your_account_number
ARIFPAY_BASE_URL=https://gateway.arifpay.org/api/sandbox
EXPO_PUBLIC_API_URL=http://localhost:8081
```

## Next Steps

If you're still experiencing issues:

1. **Check Console Logs:** Look for `[tRPC]`, `[Premium]`, or `[Arifpay]` prefixed logs
2. **Test Backend Directly:** Use curl or Postman to test `/api/trpc` endpoints
3. **Verify ArifPay Integration:** Test with their sandbox API directly
4. **Check Network Tab:** In browser dev tools, inspect the failed request

## Technical Details

### tRPC Client Configuration
- Base URL: Auto-detected from environment or Expo constants
- Endpoint: `/api/trpc`
- Transformer: SuperJSON for serialization
- Error handling: Custom fetch wrapper with HTML detection

### Backend Stack
- Server: Hono.js
- tRPC: v11.5.0
- Payment Gateway: ArifPay (CBE Direct Payment V2)
- Database: Supabase (optional, for payment verification)

---

**Status:** ✅ Fixed and Tested
**Date:** 2025-01-31
**Version:** 1.0.0
