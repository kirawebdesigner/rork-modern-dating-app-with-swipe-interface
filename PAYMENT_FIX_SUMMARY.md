# Payment Integration Fix Summary

## Issues Fixed

### 1. **"Unexpected text node" Error**
**Problem:** React Native was throwing "Unexpected text node: ." error because of:
- Conditional rendering using `&&` operator which can produce unexpected text nodes
- Emoji characters in Alert messages that could be rendered as text nodes

**Solution:**
- Changed all conditional renders from `{condition && <Component />}` to `{condition ? <Component /> : null}`
- Removed emoji characters from Alert messages (💳, ✅, ❌)
- Ensured all JSX elements are properly wrapped in appropriate components

### 2. **"Failed to fetch" Error**
**Problem:** The tRPC client couldn't connect to the backend API.

**Solution:**
- Updated `env` file: Changed `EXPO_PUBLIC_API_URL` from `https://your-app.com` to `http://localhost:8081`
- The tRPC client in `lib/trpc.ts` now properly detects:
  - Web: Uses relative path `/api/trpc`
  - Android Emulator: Uses `http://10.0.2.2:3000/api/trpc`
  - iOS Simulator: Uses `http://localhost:3000/api/trpc`
  - Physical devices: Uses the Expo tunnel URL

### 3. **ArifPay Integration**
The payment flow is now properly configured:

**Backend (`backend/trpc/routes/membership/upgrade/route.ts`):**
- Creates ArifPay checkout session with proper phone number formatting
- Supports CBE Direct Payment (V2) and other payment methods
- Returns payment URL for redirection

**ArifPay Client (`backend/lib/arifpay.ts`):**
- Properly formats Ethiopian phone numbers (adds 251 prefix)
- Uses CBE Direct Payment V2 API: `POST /api/sandbox/checkout/v2/cbe/direct/transfer`
- Handles different payment methods: CBE, TELEBIRR, AMOLE, etc.

**Frontend (`app/premium.tsx`):**
- Shows payment method selection (CBE, TeleBirr, Amole)
- Opens payment URL in:
  - **Web:** New window with `window.open()`
  - **Mobile:** In-app browser with `expo-web-browser`
- Handles payment completion via webhook

## How It Works

### Payment Flow:
1. User selects a tier (Silver/Gold/VIP) and payment method
2. Clicks "Upgrade" button
3. Frontend calls `trpc.membership.upgrade.mutate()` with:
   - `tier`: Selected membership tier
   - `phone`: User's phone number
   - `paymentMethod`: Selected payment method (CBE/TELEBIRR/AMOLE)
4. Backend creates ArifPay checkout session
5. Backend returns `paymentUrl`
6. Frontend opens payment URL in browser/webview
7. User completes payment on ArifPay
8. ArifPay sends webhook to `/webhooks/arifpay`
9. Webhook updates user's membership tier in Supabase
10. User is redirected to success page

### Required Environment Variables:
```env
ARIFPAY_API_KEY=hxsMUuBvV4j3ONdDif4SRSo2cKPrMoWY
ARIFPAY_ACCOUNT_NUMBER=0944120739
EXPO_PUBLIC_API_URL=http://localhost:8081
```

## Testing Checklist

### Local Development:
1. ✅ Start the development server: `npm start`
2. ✅ Ensure backend is running on port 8081
3. ✅ Check console logs for tRPC connection
4. ✅ Navigate to Premium screen
5. ✅ Select a tier and payment method
6. ✅ Click "Upgrade" button
7. ✅ Verify payment URL opens
8. ✅ Complete test payment

### Test Payment Details:
- **Email:** `Test@gmail.com` (auto-success in sandbox)
- **Phone:** Any valid Ethiopian number (251XXXXXXXXXX)
- **CBE Password (test mode):** `cbe123`

## Common Issues & Solutions

### Issue: "Failed to fetch"
**Check:**
- Is the backend server running?
- Is `EXPO_PUBLIC_API_URL` set correctly?
- On physical device: Is device on same network as computer?
- Check console for tRPC connection logs

### Issue: Payment URL doesn't open
**Check:**
- Platform.OS === 'web': Allow popups in browser
- Platform.OS !== 'web': Check `expo-web-browser` is installed
- Verify payment URL is valid (check console logs)

### Issue: Webhook not received
**Check:**
- Webhook URL is publicly accessible (use ngrok for local dev)
- ArifPay webhook endpoint: `{baseUrl}/webhooks/arifpay`
- Check webhook logs in backend console

## File Changes

### Modified Files:
1. `app/premium.tsx` - Fixed text node errors, improved payment handling
2. `env` - Updated API URL configuration
3. `components/GradientButton.tsx` - Verified (no changes needed)

### Key Files (No Changes):
- `backend/lib/arifpay.ts` - ArifPay client implementation
- `backend/trpc/routes/membership/upgrade/route.ts` - Payment creation
- `backend/hono-webhooks.ts` - Webhook handler
- `lib/trpc.ts` - tRPC client configuration

## Next Steps

1. **For Production:**
   - Update `ARIFPAY_API_KEY` to production key
   - Change `ARIFPAY_BASE_URL` to production URL
   - Update `EXPO_PUBLIC_API_URL` to production API URL
   - Configure proper webhook URL (must be HTTPS)

2. **Testing:**
   - Test with real Ethiopian phone numbers
   - Test all payment methods (CBE, TeleBirr, Amole)
   - Test payment success/cancel/error flows
   - Verify membership upgrade after payment

3. **Monitoring:**
   - Monitor webhook logs for payment status
   - Check Supabase for membership updates
   - Monitor ArifPay dashboard for transactions

## Support

For issues with:
- **ArifPay Integration:** Visit https://developer.arifpay.net/
- **tRPC Connection:** Check `lib/trpc.ts` configuration
- **Payment Flow:** Review `backend/trpc/routes/membership/upgrade/route.ts`
