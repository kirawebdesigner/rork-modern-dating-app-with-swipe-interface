# 🚀 Quick Start - Arifpay Payment (5 Minutes)

## Step 1: Get Arifpay Account (2 minutes)

1. Go to **https://arifpay.net**
2. Click **"Sign Up"** or **"Get Started"**
3. Complete registration:
   - Business name
   - Email
   - Phone number
   - Password
4. Verify your email

---

## Step 2: Get API Credentials (1 minute)

1. Log into Arifpay dashboard
2. Navigate to **Settings** → **API Keys**
3. You'll see:
   - **API Key** (long string starting with `pk_` or `sk_`)
   - **Merchant ID** (numeric or alphanumeric ID)
4. Click **"Copy"** button for each

---

## Step 3: Configure Your App (1 minute)

1. Open your project in code editor
2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` file
4. Paste your credentials:
   ```env
   ARIFPAY_API_KEY=pk_sandbox_your_key_here_xxx
   ARIFPAY_MERCHANT_ID=merchant_123456
   ARIFPAY_PACKAGE_NAME=app.rork.modern-dating-app-swipe
   ARIFPAY_SANDBOX=true
   ```
5. Save the file

---

## Step 4: Restart & Test (1 minute)

1. Stop your development server (press `Ctrl+C` in terminal)
2. Start it again:
   ```bash
   bun run start
   ```
3. You should see in logs:
   ```
   [Arifpay] Configuration loaded { sandboxMode: true, hasApiKey: true, hasMerchantId: true }
   ```

---

## Step 5: Test Payment Flow (1 minute)

### In Your App:
1. Open the app on device/simulator
2. Navigate to **Profile** tab
3. Tap **"Upgrade to Premium"**
4. Select **Silver** plan
5. Tap **"Upgrade to Silver"**
6. Choose **"Arifpay (Automatic)"**
7. Payment page should open
8. Use a **test card** (see Arifpay docs for test cards)
9. Complete payment
10. Return to app
11. Should see **"Payment Successful!"** ✅

---

## ✅ Success Indicators

### Backend Logs
You should see these messages in your terminal:
```
✓ [Arifpay] Configuration loaded
✓ [Arifpay] Creating checkout for user...
✓ [Arifpay] Checkout session created: sess_xxx
✓ [Arifpay] Verifying payment for user...
✓ [Arifpay] Verification result: completed true
```

### In App
- ✅ Payment method dialog appears
- ✅ Payment page opens successfully
- ✅ Can complete test payment
- ✅ Verification shows "Verifying..."
- ✅ Success screen shows
- ✅ Membership tier updated

---

## 🎯 What's Next?

### For Testing
- Try different plans (Silver, Gold, VIP)
- Test failed payment (cancel payment page)
- Test manual payment fallback
- Test on different devices

### For Production
- Complete Arifpay merchant verification
- Get production API credentials
- Set `ARIFPAY_SANDBOX=false`
- Test with real payment card
- Monitor first transactions

---

## 🐛 Troubleshooting

### Error: "Payment gateway not configured"
**Problem**: Credentials not loaded  
**Fix**: 
1. Check `.env` file exists in project root
2. Verify API key and Merchant ID are correct
3. Restart development server

### Payment page doesn't open
**Problem**: Browser permission or URL issue  
**Fix**: 
1. Check console for errors
2. Verify `expo-web-browser` is installed
3. Try on different device

### Stuck on "Verifying..."
**Problem**: Payment not completed  
**Fix**: 
1. Check Arifpay dashboard for transaction status
2. Try manual verification button
3. Wait 30 seconds and tap verify again

---

## 📋 Checklist

- [ ] Created Arifpay account
- [ ] Got API Key and Merchant ID
- [ ] Created `.env` file
- [ ] Added credentials
- [ ] Restarted server
- [ ] Saw success logs
- [ ] Tested payment flow
- [ ] Payment completed successfully
- [ ] Membership updated

---

## 🎉 You're Done!

Your payment system is now ready to use!

**Next steps:**
1. ✅ Test all payment scenarios
2. ✅ Try on multiple devices
3. ✅ Verify membership features work
4. ✅ Read full documentation
5. ✅ Plan production launch

---

## 📚 Full Documentation

For detailed information:
- **[Integration Complete](./INTEGRATION_COMPLETE.md)** - Overview
- **[Setup Summary](./ARIFPAY_SETUP_SUMMARY.md)** - Detailed setup
- **[Integration Guide](./ARIFPAY_INTEGRATION_GUIDE.md)** - Technical docs
- **[Testing Guide](./PAYMENT_TESTING_GUIDE.md)** - Test scenarios

---

## 💡 Pro Tips

1. **Always test in sandbox first** before using production
2. **Keep your API keys secret** - never commit to git
3. **Monitor logs** during testing to catch issues early
4. **Test on real devices** not just simulator
5. **Have manual payment as backup** in case of issues

---

## 📞 Need Help?

**Arifpay Issues:**
- Check: https://developer.arifpay.net
- Email: support@arifpay.net

**App Issues:**
- Review: Console logs for `[Arifpay]` messages
- Check: Documentation files in project root
- Verify: Environment variables are correct

---

**Time to first payment: ~5 minutes ⚡**

🚀 **Start accepting payments now!**
