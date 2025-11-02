# ArifPay Quick Start Guide

## Overview
This app uses ArifPay for payment processing. Users can upgrade their membership tier (Silver, Gold, VIP) using various Ethiopian payment methods.

## For Developers

### Environment Setup
Make sure you have these environment variables set:

```env
ARIFPAY_API_KEY=hxsMUuBvV4j3ONdDif4SRSo2cKPrMoWY
ARIFPAY_BASE_URL=https://gateway.arifpay.org/api/sandbox
ARIFPAY_ACCOUNT_NUMBER=0944120739
```

### Testing Locally

1. **Start the backend**:
   ```bash
   npm start
   # Backend runs on http://localhost:8081
   ```

2. **Start Expo**:
   ```bash
   npx expo start
   ```

3. **Test the payment flow**:
   - Log in with any phone number (format: 251XXXXXXXXX)
   - Go to Premium screen
   - Select a tier
   - Click Upgrade
   - Complete payment in sandbox

### Payment URLs

After clicking upgrade, users are redirected to:
- **Payment**: `https://checkout.arifpay.org/checkout/{SESSION_ID}`
- **Success**: `{YOUR_APP}/payment-success`
- **Cancel**: `{YOUR_APP}/payment-cancel`
- **Error**: `{YOUR_APP}/payment-error`

### Webhook

ArifPay sends payment notifications to:
```
POST {YOUR_APP}/webhooks/arifpay
```

The webhook automatically:
1. Verifies the payment
2. Extracts user phone number
3. Determines tier based on amount
4. Updates Supabase memberships table
5. Sets expiration to 1 month from now

## For Users

### How to Upgrade

1. **Go to Premium**
   - Tap Profile tab
   - Tap "Upgrade to Premium"

2. **Choose Your Plan**
   - Free: Basic features
   - Silver (1,600 ETB/month): 30 messages/day, 100 swipes
   - Gold (3,200 ETB/month): 100 messages/day, unlimited swipes
   - VIP (4,800 ETB/month): Everything unlimited

3. **Select Payment Method**
   - TeleBirr (Recommended)
   - CBE Birr
   - Amole
   - M-PESA

4. **Complete Payment**
   - You'll be redirected to ArifPay checkout
   - Enter your payment details
   - Confirm payment
   - Your membership is automatically upgraded

### Payment Methods

#### TeleBirr
- Most popular option
- Instant confirmation
- Mobile money wallet

#### CBE Birr
- Commercial Bank of Ethiopia
- Bank transfer
- Secure and reliable

#### Amole
- Digital wallet
- Fast processing
- Wide acceptance

#### M-PESA
- Mobile money
- Quick and easy
- Available nationwide

### Pricing

| Tier | Price (ETB) | Price (USD) | Messages | Swipes | Views |
|------|------------|-------------|----------|--------|-------|
| Free | 0 | $0 | 5/day | 50/day | 10/day |
| Silver | 1,600 | $10 | 30/day | 100/day | 50/day |
| Gold | 3,200 | $20 | 100/day | Unlimited | 100/day |
| VIP | 4,800 | $30 | Unlimited | Unlimited | Unlimited |

### Membership Features

#### Free Tier
- ✅ Basic messaging (5/day)
- ✅ Limited swipes (50/day)  
- ✅ Limited views (10/day)
- ✅ Basic filters
- ❌ Incognito mode
- ❌ Undo swipes

#### Silver Tier
- ✅ More messages (30/day)
- ✅ More swipes (100/day)
- ✅ More views (50/day)
- ✅ 1 boost per month
- ✅ 5 super likes
- ❌ Advanced filters
- ❌ Incognito mode

#### Gold Tier  
- ✅ 100 messages/day
- ✅ Unlimited swipes
- ✅ 100 views/day
- ✅ Advanced filters
- ✅ Incognito mode
- ✅ Undo swipes
- ✅ 2 boosts/month
- ✅ 10 super likes

#### VIP Tier
- ✅ Everything unlimited
- ✅ Full incognito
- ✅ Priority matching
- ✅ 5 boosts/month
- ✅ 20 super likes
- ✅ All advanced filters

### Subscription Details

- **Duration**: 1 month from payment date
- **Renewal**: Manual (not automatic)
- **Cancellation**: Anytime from settings
- **Refunds**: Contact support
- **Payment Security**: Handled by ArifPay (PCI compliant)

### Troubleshooting

#### Payment Fails
- Check internet connection
- Verify payment method has sufficient funds
- Try a different payment method
- Contact your bank/wallet provider

#### Not Redirected After Payment
- Don't close the payment page too early
- Wait for confirmation
- Check your membership status in app
- Contact support if issue persists

#### Membership Not Updated
- Wait a few minutes (webhook processing)
- Restart the app
- Check your phone number is correct
- Contact support with transaction ID

### Support

For payment issues:
1. Check transaction in your payment app
2. Note the transaction ID
3. Take screenshots
4. Contact app support with details

## API Reference

### Create Payment Session

```typescript
const result = await trpc.membership.upgrade.mutate({
  tier: 'gold',
  phone: '251912345678',
  paymentMethod: 'TELEBIRR',
});

// Returns:
{
  success: true,
  requiresPayment: true,
  paymentUrl: 'https://checkout.arifpay.org/checkout/SESSION_ID',
  sessionId: 'SESSION_ID',
  amount: 3200
}
```

### Verify Payment

```typescript
import { arifpay } from '@/backend/lib/arifpay';

const verification = await arifpay.verifyPayment(sessionId);

// Returns:
{
  status: 'SUCCESS',
  amount: 3200,
  transactionId: 'TXN_ID',
  paidAt: '2025-01-01T12:00:00Z'
}
```

### Check Membership Status

```typescript
import { useMembership } from '@/hooks/membership-context';

const { tier, expiresAt, isExpired } = useMembership();
```

## Testing in Sandbox

### Test Phone Numbers
Use these for testing:
- `251911111111`
- `251922222222`
- `251933333333`

### Test Payment Flow
1. Select any tier
2. Use sandbox payment
3. Transaction always succeeds
4. No real money charged

### Test Webhook
Use tools like ngrok to expose localhost:
```bash
ngrok http 8081
# Use ngrok URL as webhook in ArifPay dashboard
```

## Production Checklist

Before going live:
- [ ] Replace sandbox API key with production key
- [ ] Update ARIFPAY_BASE_URL to production
- [ ] Set up production webhook URL (must be HTTPS)
- [ ] Test with real payment methods
- [ ] Add error monitoring (Sentry, etc.)
- [ ] Add analytics tracking
- [ ] Test refund flow
- [ ] Document customer support process
- [ ] Add terms and conditions
- [ ] Add privacy policy for payments
- [ ] Set up receipt/invoice generation
- [ ] Test all payment methods
- [ ] Verify webhook retries work
- [ ] Set up payment failure alerts

## Security Best Practices

1. **Never log sensitive data**
   - Don't log full phone numbers in production
   - Don't log API keys
   - Don't log payment details

2. **Validate webhook signatures**
   - Verify webhook comes from ArifPay
   - Check nonce is unique
   - Verify amount matches expected

3. **Use HTTPS everywhere**
   - All API calls over HTTPS
   - Webhook URL must be HTTPS
   - No mixed content

4. **Store API keys securely**
   - Use environment variables
   - Never commit keys to git
   - Rotate keys regularly

5. **Implement rate limiting**
   - Limit payment attempts
   - Prevent webhook spam
   - Throttle API calls

## Common Issues

### "Failed to fetch"
- Backend not running
- Wrong port (should be 8081)
- CORS not enabled
- Network unreachable

### "Invalid phone number"
- Must start with 251
- No spaces or special characters
- Example: 251912345678

### "Payment verification failed"
- Webhook not received
- Session ID mismatch
- ArifPay API down
- Network timeout

### "Profile not found"
- User not registered
- Phone number mismatch
- Database connection issue

## Resources

- **ArifPay Docs**: https://developer.arifpay.net/
- **Checkout API**: https://developer.arifpay.net/api/checkout
- **Webhook Guide**: https://developer.arifpay.net/webhooks
- **Payment Methods**: https://developer.arifpay.net/payment-methods
- **Support**: support@arifpay.com
