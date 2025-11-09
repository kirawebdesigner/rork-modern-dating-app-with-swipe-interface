# 🧪 ArifPay Integration Test Checklist

## ✅ Pre-Test Setup

1. **Environment Variables**
   - [ ] `ARIFPAY_API_KEY` is set in `env` file
   - [ ] `ARIFPAY_BASE_URL=https://gateway.arifpay.net` is set
   - [ ] `ARIFPAY_ACCOUNT_NUMBER` is set
   - [ ] `EXPO_PUBLIC_API_URL` points to backend (default: `http://localhost:8081`)

2. **Backend Server**
   - [ ] Backend server is running (Rork handles this automatically)
   - [ ] Can access `http://localhost:8081/health` endpoint
   - [ ] tRPC router is accessible at `http://localhost:8081/api/trpc`

3. **Test Phone Number**
   - [ ] Have a valid Ethiopian phone number (09XXXXXXXX or 2519XXXXXXXX)
   - [ ] Phone number is stored in AsyncStorage or logged in

## 🎯 Test Scenarios

### Test 1: Basic Flow (CBE Payment)
1. **Navigate to Premium Page**
   - [ ] Open app
   - [ ] Navigate to Profile tab
   - [ ] Tap on "Premium" or "Upgrade" button
   - [ ] Premium screen loads successfully

2. **Select Membership Tier**
   - [ ] View all tiers (Free, Silver, Gold, VIP)
   - [ ] Select a paid tier (Silver/Gold/VIP)
   - [ ] See correct pricing in ETB

3. **Select Payment Method**
   - [ ] CBE is pre-selected (default)
   - [ ] Can switch between CBE, TeleBirr, Amole
   - [ ] Selected method is highlighted

4. **Initiate Payment**
   - [ ] Tap "Upgrade to [Tier]" button
   - [ ] Button shows "Processing..." state
   - [ ] No immediate errors

5. **Check Console Logs**
   ```
   Expected logs:
   [Premium] Creating payment for tier: silver
   [Premium] Phone: 2519XXXXXXXX
   [Premium] Payment method: CBE
   [tRPC Upgrade] Processing upgrade request
   [Arifpay] CBE Full URL: https://gateway.arifpay.net/api/checkout/v2/cbe/direct/transfer
   [Arifpay] CBE Response status: 200
   [Premium] Opening payment URL: https://gateway.arifpay.net/pay/xxx
   ```

6. **Payment Window Opens**
   - [ ] On Web: New window/tab opens
   - [ ] On Mobile: In-app browser opens
   - [ ] Payment page loads from ArifPay
   - [ ] Can see CBE payment form

### Test 2: TeleBirr Payment
1. [ ] Select TeleBirr as payment method
2. [ ] Click Upgrade
3. [ ] Console shows correct endpoint: `/api/checkout/session`
4. [ ] TeleBirr payment page opens

### Test 3: Error Handling

#### Backend Not Running
1. [ ] Stop backend server
2. [ ] Try to upgrade
3. [ ] See "Server Offline" alert
4. [ ] Alert mentions "bun backend/hono.ts"

#### Invalid Phone Number
1. [ ] Remove phone from AsyncStorage
2. [ ] Try to upgrade
3. [ ] See "Phone Required" alert

#### Same Tier
1. [ ] Already on Silver
2. [ ] Try to upgrade to Silver again
3. [ ] See "Current Plan" alert

## 🔍 Console Log Checklist

### Successful Payment Creation
```
✅ [Arifpay] Client initialized
✅ [Arifpay] Base URL: https://gateway.arifpay.net
✅ [Arifpay] Normalized phone number: 2519XXXXXXXX
✅ [Arifpay] Using CBE Direct Payment (V2)
✅ [Arifpay] CBE Full URL: https://gateway.arifpay.net/api/checkout/v2/cbe/direct/transfer
✅ [Arifpay] CBE Response status: 200
✅ [Arifpay] CBE Parsed response: { "error": false, "data": {...} }
✅ [tRPC Upgrade] ✅ Payment created successfully
✅ [Premium] Opening payment URL: https://...
```

### Error Scenarios

#### HTML Response (Wrong URL)
```
❌ [Arifpay] Failed to parse CBE response
❌ Error: ArifPay API returned HTML instead of JSON
```

#### Network Error
```
❌ [tRPC] ❌ Network error
❌ [Premium] Connection Error
```

#### Invalid API Key
```
❌ [Arifpay] CBE payment creation failed with status: 401
❌ Error: Unauthorized
```

## 🐛 Common Issues & Solutions

### Issue: "Unexpected token '<', <!DOCTYPE..."
**Cause:** Backend returning HTML instead of JSON  
**Solution:** 
- Base URL was wrong (fixed: `gateway.arifpay.net`)
- Endpoint path was missing `/api` (fixed)
- API key invalid (check env file)

### Issue: "Failed to fetch"
**Cause:** Backend server not running  
**Solution:** 
- Rork platform handles backend automatically
- Check `http://localhost:8081/health` endpoint
- Verify `EXPO_PUBLIC_API_URL` in env

### Issue: Payment window doesn't open
**Cause:** Popup blocked or invalid URL  
**Solution:** 
- Web: Allow popups in browser
- Mobile: Check network permissions
- Verify `paymentUrl` in response

### Issue: "Unexpected text node" error
**Cause:** React Native doesn't allow text outside `<Text>` component  
**Status:** ✅ Fixed - all text is wrapped in `<Text>` components

## 📱 Platform-Specific Tests

### Web Browser
- [ ] Payment opens in new tab
- [ ] Can complete payment in popup
- [ ] Returns to app after payment

### iOS
- [ ] In-app browser opens
- [ ] Can navigate payment flow
- [ ] Can dismiss browser
- [ ] Proper alert after dismissal

### Android
- [ ] In-app browser opens
- [ ] Can navigate payment flow
- [ ] Back button works
- [ ] Proper alert after completion

## 🎉 Success Criteria

All of these should be true:
- ✅ No HTML/DOCTYPE errors in console
- ✅ Payment URL is generated successfully
- ✅ Payment window/browser opens
- ✅ ArifPay payment page loads
- ✅ Can see payment form (CBE/TeleBirr/etc)
- ✅ Clear error messages for all failure scenarios
- ✅ Proper loading states during processing
- ✅ Logs are detailed and helpful for debugging

## 📞 Support

If tests fail:
1. Check console logs for specific errors
2. Verify all environment variables
3. Test backend health endpoint: `curl http://localhost:8081/health`
4. Review `ARIFPAY_FIX_COMPLETE.md` for detailed info
5. Check ArifPay dashboard for API key validity

## 🚀 Next Steps After Testing

Once all tests pass:
1. Test with real phone number
2. Complete a test payment (sandbox mode)
3. Verify webhook receives payment confirmation
4. Check membership is upgraded in database
5. Test production credentials (when ready)
