# Payment Testing Guide

## Quick Start Testing

### 1. Setup Arifpay Sandbox
1. Create account at [Arifpay](https://arifpay.net)
2. Get your sandbox credentials
3. Copy `.env.example` to `.env`
4. Add your credentials:
   ```env
   ARIFPAY_API_KEY=your_sandbox_api_key
   ARIFPAY_MERCHANT_ID=your_sandbox_merchant_id
   ARIFPAY_SANDBOX=true
   ```

### 2. Test Payment Flow

#### Test Membership Upgrade
1. Open app and navigate to profile
2. Tap "Upgrade to Premium"
3. Select a plan (Silver, Gold, or VIP)
4. Tap "Upgrade to [Plan]"
5. Choose "Arifpay (Automatic)"
6. Complete payment on Arifpay page with test card
7. Return to app
8. Tap "I've Paid - Verify Now"
9. Should see "Payment Successful!" message

#### Test Manual Payment
1. From premium screen, choose "Manual Payment"
2. Follow Telegram instructions
3. Admin approves via Supabase (see `ADMIN_PAYMENT_GUIDE.md`)

### 3. Test Credit Purchase
Once credits feature is implemented:
1. Navigate to credits store
2. Select credit package
3. Choose payment method
4. Complete purchase
5. Verify credits added to account

---

## Test Cards (Arifpay Sandbox)

Use these test cards in sandbox mode:

### Successful Payment
- **Card Number**: Check Arifpay documentation
- **Expiry**: Any future date
- **CVV**: Any 3 digits

### Failed Payment
- **Card Number**: Check Arifpay documentation for decline cards
- **Expiry**: Any future date
- **CVV**: Any 3 digits

---

## Test Scenarios

### Scenario 1: Successful Payment
**Steps:**
1. Select Gold plan
2. Choose Arifpay payment
3. Use successful test card
4. Complete payment
5. Verify membership upgraded

**Expected Result:**
✅ Checkout session created  
✅ Payment page opens  
✅ Payment completed on Arifpay  
✅ Status: "completed"  
✅ Membership activated  

### Scenario 2: Cancelled Payment
**Steps:**
1. Select Silver plan
2. Choose Arifpay payment
3. Close payment page without paying
4. Return to app

**Expected Result:**
✅ Checkout session created  
✅ Payment page opened  
✅ Status: "pending"  
✅ Option to reopen payment page  
✅ Option to switch to manual payment  

### Scenario 3: Failed Payment
**Steps:**
1. Select VIP plan
2. Choose Arifpay payment
3. Use decline test card
4. Submit payment

**Expected Result:**
✅ Checkout session created  
✅ Payment page opens  
✅ Payment declined on Arifpay  
✅ Status: "failed"  
✅ Option to retry  

### Scenario 4: Network Error
**Steps:**
1. Turn off internet
2. Try to create checkout session
3. Turn internet back on
4. Retry

**Expected Result:**
✅ Error message shown  
✅ Option to retry  
✅ Can switch to manual payment  

---

## Verification Testing

### Manual Verification
Test the "I've Paid - Verify Now" button:
1. Create checkout session
2. Don't complete payment
3. Return to app
4. Tap verify button
5. Should show "verifying..." state
6. Should poll for payment status

### Auto Verification
After completing payment:
1. App should automatically start verification
2. Should poll every 3 seconds
3. Should detect completed payment
4. Should show success message

---

## Platform-Specific Testing

### iOS Testing
- Test in Expo Go app
- Test opening payment page
- Test returning to app
- Verify deep linking works

### Android Testing
- Test in Expo Go app
- Test opening payment page
- Test returning to app
- Verify deep linking works

### Web Testing
- Test in browser
- Payment opens in new tab
- Return to original tab
- Manual verification required

---

## Backend Testing

### Test tRPC Routes Directly
Use the tRPC panel or create test calls:

```typescript
// Test create checkout
const result = await trpc.payment.createCheckout.mutate({
  tier: 'gold',
});
console.log('Session:', result.sessionId);
console.log('URL:', result.checkoutUrl);

// Test verify payment
const status = await trpc.payment.verify.query({
  sessionId: 'test_session_id',
});
console.log('Status:', status.status);
console.log('Success:', status.success);
```

### Check Logs
Monitor backend logs for:
```
[Arifpay] Configuration loaded { sandboxMode: true, hasApiKey: true, ... }
[Arifpay] Creating checkout for user...
[Arifpay] Checkout session created: sess_xxx
[Arifpay] Verifying payment for user...
[Arifpay] Verification result: completed true
```

---

## Database Verification

After successful payment, verify in Supabase:

```sql
-- Check membership updated
SELECT 
  p.phone,
  p.name,
  m.tier,
  m.expires_at
FROM profiles p
JOIN memberships m ON m.user_id = p.id
WHERE p.phone = 'test_user_phone';
```

Should show:
- `tier` updated to selected plan
- `expires_at` set to 30 days from now

---

## Error Testing

### Test Missing Configuration
1. Remove `ARIFPAY_API_KEY` from `.env`
2. Try to create checkout
3. Should show: "Payment gateway not configured"

### Test Invalid Credentials
1. Set wrong API key
2. Try to create checkout
3. Should show: "Failed to create checkout session"

### Test Network Issues
1. Simulate slow/failed network
2. Verify error handling
3. Ensure retry mechanism works

---

## Debugging Tips

### Enable Verbose Logging
Add more logs to track flow:
```typescript
console.log('[Payment Test] Step 1: User selected', tier);
console.log('[Payment Test] Step 2: Creating session...');
console.log('[Payment Test] Step 3: Session created', sessionId);
console.log('[Payment Test] Step 4: Verifying...');
console.log('[Payment Test] Step 5: Result', status);
```

### Check Network Tab
In browser DevTools:
- Inspect API calls to Arifpay
- Check request/response payloads
- Verify status codes

### Test with Real User Flow
1. Create fresh test account
2. Complete full onboarding
3. Try to upgrade membership
4. Verify all features work

---

## Performance Testing

### Load Test Payment Endpoints
- Create multiple concurrent sessions
- Verify no rate limiting issues
- Check response times

### Verify Polling Performance
- Monitor network usage during verification
- Check polling frequency (should be 3s)
- Ensure polling stops after success/failure

---

## Checklist

Before marking payment integration as complete:

**Functionality**
- [ ] Can create checkout session
- [ ] Payment page opens correctly
- [ ] Can verify payment status
- [ ] Success flow works end-to-end
- [ ] Failure flow handles gracefully
- [ ] Manual payment fallback available

**UI/UX**
- [ ] Loading states show properly
- [ ] Error messages are clear
- [ ] Success message is celebratory
- [ ] Can retry failed payments
- [ ] Can switch payment methods

**Security**
- [ ] API keys not in client code
- [ ] Payment verification is server-side
- [ ] No payment data stored insecurely

**Platform Support**
- [ ] Works on iOS (Expo Go)
- [ ] Works on Android (Expo Go)
- [ ] Works on web browser

**Documentation**
- [ ] Code is commented
- [ ] README updated
- [ ] Environment variables documented
- [ ] Admin guide available

---

## Support Resources

- **Arifpay Docs**: https://developer.arifpay.net
- **Arifpay Test Cards**: Check Arifpay sandbox documentation
- **App Integration**: See `ARIFPAY_INTEGRATION_GUIDE.md`
- **Manual Payment**: See `ADMIN_PAYMENT_GUIDE.md`

---

**Happy Testing! 🎉**

If you encounter issues:
1. Check logs in backend console
2. Verify environment variables
3. Test in Arifpay dashboard
4. Contact Arifpay support if API issues persist
