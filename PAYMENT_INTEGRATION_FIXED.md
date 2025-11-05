# ArifPay Payment Integration - Fixed

## Issues Fixed

### 1. TRPCClientError: "Unexpected token '<', "<!DOCTYPE"..."
**Root Cause**: Backend was returning HTML error pages instead of JSON responses.

**Solutions Applied**:
- Enhanced error handling in `lib/trpc.ts` to detect HTML responses
- Added better logging to identify the exact error
- Improved CORS configuration in `backend/hono.ts`
- Added error boundary with `onError` handler in tRPC server
- Added health check endpoint `/health` to verify backend status

### 2. ArifPay CBE Direct Payment V2 Integration
**Implementation**: Using CBE Direct Payment V2 (Single Request) - Simpler integration

**Configuration**:
- **Endpoint**: `https://gateway.arifpay.org/api/sandbox/checkout/v2/cbe/direct/transfer`
- **Account Number**: `01320811436100` (from docs example)
- **Bank**: `AWINETAA` (as specified in docs)
- **Phone Format**: `251XXXXXXXXX` (no +251 or 09)
- **Nonce**: Unique per request using UUID
- **Expire Date**: 24 hours from creation

**Required Fields Added**:
```javascript
{
  name: "Product name",
  description: "Product description", // Added
  quantity: 1,
  price: amount,
  image: "https://..." // Added
}
```

### 3. Error Handling Improvements

**Frontend** (`app/premium.tsx`):
- Better error messages for network failures
- Retry mechanism for failed payments
- Proper loading states
- Clear user feedback via alerts
- Removed emojis from alerts (can cause "Unexpected text node" errors)

**Backend** (`backend/hono.ts`):
- Added global error handler
- Enhanced CORS configuration
- Added comprehensive logging
- Health check endpoint for debugging

**tRPC Client** (`lib/trpc.ts`):
- Detects HTML error responses
- Improved request/response logging
- Better error propagation

### 4. Configuration Updates

**Environment Variables** (`env`):
```bash
ARIFPAY_API_KEY=hxsMUuBvV4j3ONdDif4SRSo2cKPrMoWY
ARIFPAY_ACCOUNT_NUMBER=01320811436100
ARIFPAY_BASE_URL=https://gateway.arifpay.org/api/sandbox
```

## Testing Instructions

### 1. Check Backend is Running
```bash
curl http://localhost:8081/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-...",
  "env": {
    "hasArifpayKey": true,
    "arifpayBaseUrl": "default"
  }
}
```

### 2. Test Payment Flow

**Test Credentials** (from docs):
- **Email**: `Test@gmail.com` (will be marked as SUCCESS automatically)
- **Phone**: Valid Ethiopian phone number `251XXXXXXXXX`
- **Password** (for Step 2 in test mode): `cbe123`

**Steps**:
1. Open premium screen
2. Select a tier (Silver, Gold, or VIP)
3. Select payment method (CBE recommended for testing)
4. Click "Upgrade"
5. Browser window/tab should open with ArifPay payment page
6. Complete payment (in test mode, it will auto-complete)
7. Check webhook at `/webhooks/arifpay` for confirmation

### 3. Monitor Logs

**Frontend logs to watch**:
```
[Premium] Creating payment for tier: ...
[Premium] Phone: ...
[Premium] Payment method: ...
[Premium] Mutation result: ...
[Premium] Opening payment URL: ...
```

**Backend logs to watch**:
```
[Arifpay] Client initialized with API key: ...
[Arifpay] Using CBE Direct Payment (V2)
[Arifpay] Creating CBE direct payment with payload: ...
[Arifpay] CBE Raw response: ...
[Arifpay] CBE Parsed response: ...
```

**tRPC logs to watch**:
```
[tRPC] Using base URL: ...
[tRPC] Fetching: ...
[tRPC] Response status: ...
```

## Common Issues & Solutions

### Issue: "Failed to fetch"
**Cause**: Backend server not running or wrong URL
**Solution**: 
1. Check if backend is running: `curl http://localhost:8081/health`
2. Verify `EXPO_PUBLIC_API_URL` in env file
3. Check console for tRPC URL being used

### Issue: "Unexpected token '<', "<!DOCTYPE"..."
**Cause**: Backend returning HTML error page
**Solution**:
1. Check backend logs for errors
2. Verify tRPC endpoint is correct
3. Ensure CORS is properly configured
4. Check if all required packages are installed

### Issue: Payment window doesn't open
**Cause**: Pop-up blocker or invalid URL
**Solution**:
1. Check browser console for errors
2. Allow pop-ups for the site
3. Verify paymentUrl in response
4. Check if WebBrowser is working (mobile)

### Issue: Webhook not received
**Cause**: notifyUrl not accessible or not returning HTTP 200
**Solution**:
1. Ensure webhook endpoint exists: `/webhooks/arifpay`
2. Check webhook handler responds with 200
3. Use ngrok or similar for local testing
4. Check ArifPay dashboard for webhook logs

## Payment Flow Diagram

```
User clicks "Upgrade"
      ↓
Frontend validates (phone, tier)
      ↓
Frontend calls tRPC mutation
      ↓
Backend receives request
      ↓
Backend creates ArifPay session
      ↓
ArifPay returns paymentUrl
      ↓
Frontend opens paymentUrl
      ↓
User completes payment
      ↓
ArifPay sends webhook
      ↓
Backend processes webhook
      ↓
Database updated
      ↓
User membership upgraded
```

## Next Steps

1. **Test in production**: Switch to production API key and base URL
2. **Add webhook handler**: Implement proper webhook processing in `backend/hono-webhooks.ts`
3. **Database integration**: Connect to Supabase to update user membership
4. **Error recovery**: Add payment status checking
5. **User notifications**: Send confirmation emails/push notifications

## Files Modified

1. `backend/lib/arifpay.ts` - Updated CBE V2 integration
2. `backend/hono.ts` - Enhanced error handling and CORS
3. `lib/trpc.ts` - Better error detection and logging
4. `app/premium.tsx` - Improved error handling
5. `env` - Updated configuration

## References

- [ArifPay Documentation](https://developer.arifpay.net/)
- [CBE Direct Payment Guide](https://developer.arifpay.net/docs/cbe-direct-payment)
- [tRPC Documentation](https://trpc.io/)
