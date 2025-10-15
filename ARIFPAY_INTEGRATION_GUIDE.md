# Arifpay Payment Integration Guide

## Overview
This app now supports **Arifpay** payment gateway for automated payment processing, in addition to manual Telebirr payments.

## Features
- ✅ Automated payment flow via Arifpay
- ✅ Real-time payment verification
- ✅ Support for membership upgrades (Silver, Gold, VIP)
- ✅ Support for credit purchases
- ✅ Fallback to manual payment (Telebirr)
- ✅ Web and mobile compatible

---

## Setup Instructions

### 1. Install Dependencies
The following packages are already installed:
```bash
bun add arifpay-express-plugin dotenv uuid
```

### 2. Configure Environment Variables
Create a `.env` file in your project root with the following:

```env
# Arifpay Configuration
ARIFPAY_API_KEY=your_api_key_here
ARIFPAY_MERCHANT_ID=your_merchant_id_here
ARIFPAY_PACKAGE_NAME=app.rork.modern-dating-app-swipe
ARIFPAY_SANDBOX=true  # Set to false for production
```

**How to get your Arifpay credentials:**
1. Sign up at [https://arifpay.net](https://arifpay.net)
2. Complete merchant verification
3. Navigate to **Settings** → **API Keys**
4. Copy your **API Key** and **Merchant ID**
5. Use **Sandbox Mode** for testing

### 3. Backend Structure
The backend payment routes are located in:
```
backend/
├── lib/
│   ├── arifpay-config.ts      # Configuration & validation
│   └── arifpay-client.ts      # Payment API client
└── trpc/
    └── routes/
        └── payment/
            ├── create-checkout/route.ts       # Create payment session
            ├── verify/route.ts                # Verify payment status
            └── credits-checkout/route.ts      # Credits purchase
```

### 4. Frontend Screens
- **`/premium`** - Plan selection with payment method choice
- **`/arifpay-checkout`** - Automated Arifpay payment flow
- **`/payment-verification`** - Manual Telebirr payment

---

## Payment Flow

### Membership Upgrade Flow
1. User navigates to `/premium`
2. User selects a plan (Silver, Gold, VIP)
3. User clicks "Upgrade" button
4. Alert shows payment method options:
   - **Arifpay (Automatic)** → Opens `/arifpay-checkout`
   - **Manual Payment** → Opens `/payment-verification`
5. For Arifpay:
   - Creates checkout session via `trpc.payment.createCheckout`
   - Opens payment page in browser/webview
   - User completes payment on Arifpay
   - Returns to app and verifies via `trpc.payment.verify`
   - Success → Membership activated
   - Failure → Retry or switch to manual payment

### Credits Purchase Flow
Similar to membership upgrade, but uses `trpc.payment.creditsCheckout` endpoint.

---

## API Reference

### tRPC Routes

#### `payment.createCheckout`
Creates an Arifpay checkout session for membership upgrades.

**Input:**
```typescript
{
  tier: 'silver' | 'gold' | 'vip',
  successUrl?: string,  // Default: myapp://payment-success
  cancelUrl?: string,   // Default: myapp://payment-cancelled
}
```

**Output:**
```typescript
{
  success: true,
  sessionId: string,
  checkoutUrl: string,
  orderId: string,
  amount: number,      // Amount in ETB
  currency: 'ETB',
}
```

#### `payment.verify`
Verifies payment status for a given session.

**Input:**
```typescript
{
  sessionId: string,
}
```

**Output:**
```typescript
{
  success: boolean,
  status: 'completed' | 'pending' | 'failed' | 'cancelled',
  sessionId: string,
  orderId: string,
  amount?: number,
  currency?: string,
  transactionId?: string,
  paidAt?: string,
}
```

#### `payment.creditsCheckout`
Creates an Arifpay checkout session for credit purchases.

**Input:**
```typescript
{
  kind: 'superLikes' | 'boosts' | 'compliments' | 'messages' | 'unlocks',
  amount: number,      // Package size (e.g., 5, 10, 25)
  successUrl?: string,
  cancelUrl?: string,
}
```

**Output:** Same as `payment.createCheckout`

---

## Pricing

### Membership Plans (Monthly)
| Plan   | USD    | ETB (×160) |
|--------|--------|------------|
| Silver | $9.99  | 1,598 ETB  |
| Gold   | $19.99 | 3,198 ETB  |
| VIP    | $29.99 | 4,798 ETB  |

### Credit Packages
| Type        | Amount | USD    | ETB (×160) |
|-------------|--------|--------|------------|
| Super Likes | 5      | $4.99  | 798 ETB    |
| Super Likes | 10     | $8.99  | 1,438 ETB  |
| Super Likes | 25     | $19.99 | 3,198 ETB  |
| Boosts      | 1      | $4.99  | 798 ETB    |
| Boosts      | 5      | $19.99 | 3,198 ETB  |
| Boosts      | 10     | $34.99 | 5,598 ETB  |

---

## Testing

### Sandbox Mode
When `ARIFPAY_SANDBOX=true`, all payments are test transactions:
- Use Arifpay test cards
- No real money is charged
- Test payment verification flow

### Test Scenarios
1. **Successful Payment**
   - Complete payment on Arifpay page
   - Verify status shows "completed"
   - Membership/credits activated

2. **Failed Payment**
   - Cancel payment on Arifpay page
   - Verify status shows "failed" or "cancelled"
   - User can retry or switch to manual payment

3. **Verification Timeout**
   - Close payment page without completing
   - Manual verification button available
   - User can reopen payment page

---

## Error Handling

### Common Errors

**"Payment gateway not configured"**
- Cause: Missing `ARIFPAY_API_KEY` or `ARIFPAY_MERCHANT_ID`
- Solution: Add credentials to `.env` file

**"Failed to create checkout session"**
- Cause: Invalid API credentials or network issue
- Solution: Verify credentials and check logs

**"Payment was not completed"**
- Cause: User cancelled or payment failed
- Solution: Offer retry or manual payment option

### Fallback Strategy
If Arifpay is unavailable:
1. App shows both payment options
2. User can choose "Manual Payment"
3. Redirects to Telegram-based verification
4. Admin approves manually (see `ADMIN_PAYMENT_GUIDE.md`)

---

## Security Best Practices

1. **Never expose API keys in client code**
   - ✅ Kept in backend `.env` file
   - ✅ Only accessible via tRPC routes

2. **Validate payment server-side**
   - ✅ All verification done in backend
   - ✅ Client cannot spoof payment status

3. **Use HTTPS in production**
   - Set `ARIFPAY_SANDBOX=false`
   - Update base URL in `arifpay-client.ts` if needed

4. **Store transaction records**
   - Consider adding a `payments` table in Supabase
   - Log all transactions for audit trail

---

## Troubleshooting

### Logs
Check console logs for debugging:
```
[Arifpay] Configuration loaded
[Arifpay] Creating checkout for user...
[Arifpay] Checkout session created: xxx
[Arifpay] Verifying payment for user...
[Arifpay] Verification result: completed
```

### Common Issues

**Payment page doesn't open**
- Check `expo-web-browser` is installed
- Verify URL is valid
- Check browser permissions on mobile

**Verification stuck on "pending"**
- Payment may still be processing
- User should wait or contact support
- Admin can verify manually in Arifpay dashboard

**Wrong amount charged**
- Verify `ETB_RATE` is correct (currently 160)
- Check Arifpay currency settings
- Update pricing in route files if needed

---

## Production Checklist

Before going live:
- [ ] Set `ARIFPAY_SANDBOX=false`
- [ ] Add real Arifpay credentials
- [ ] Test with real payment cards
- [ ] Set up webhook for payment notifications (optional)
- [ ] Add payment history in user profile
- [ ] Enable transaction logging to database
- [ ] Test on both iOS and Android devices
- [ ] Verify deep linking works (success/cancel URLs)
- [ ] Update app privacy policy with payment terms

---

## Support

For Arifpay-related issues:
- **Arifpay Documentation**: [https://developer.arifpay.net](https://developer.arifpay.net)
- **Arifpay Support**: support@arifpay.net
- **Integration Help**: Check logs in backend console

For app-specific issues:
- Check `ADMIN_PAYMENT_GUIDE.md` for manual payment flow
- Review database schema in `database-schema.sql`
- Contact technical support

---

## Next Steps

### Recommended Enhancements
1. **Add payment history screen**
   - Show past transactions
   - Allow users to download receipts

2. **Implement webhooks**
   - Real-time payment notifications
   - Automatic membership activation

3. **Add subscription management**
   - Auto-renewal for monthly plans
   - Cancellation flow
   - Downgrade options

4. **Analytics integration**
   - Track conversion rates
   - Monitor failed payments
   - A/B test payment flows

---

**Last Updated**: 2025-10-15
**Arifpay Express Plugin Version**: v1.0.0.0
**App Version**: 1.0.0
