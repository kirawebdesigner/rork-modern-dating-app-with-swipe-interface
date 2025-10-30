# Arifpay Payment Integration Guide

## Overview
Your dating app now has **Arifpay payment gateway** integrated for membership upgrades and credit purchases using the Hono backend.

## What's Been Integrated

### 1. Backend Payment Client (`backend/lib/arifpay.ts`)
- `createCheckout()` - Creates payment checkout session
- `verifyPayment()` - Verifies payment status
- `cancelCheckout()` - Cancels payment session

### 2. Updated tRPC Routes

#### Membership Upgrade (`backend/trpc/routes/membership/upgrade/route.ts`)
```typescript
const result = await trpc.membership.upgrade.useMutation();
// Returns: { checkoutUrl, sessionId, transactionId, amount }
```

**Pricing:**
- Free: 0 ETB
- Silver: 499 ETB
- Gold: 999 ETB  
- VIP: 1999 ETB

#### Credits Purchase (`backend/trpc/routes/credits/buy/route.ts`)
```typescript
const result = await trpc.credits.buy.useMutation();
```

**Pricing:**
- Super Likes: 50 ETB each
- Boosts: 100 ETB each
- Compliments: 30 ETB each
- Messages: 20 ETB each
- Unlocks: 75 ETB each

#### Payment Verification (`backend/trpc/routes/payment/verify/route.ts`)
```typescript
const result = await trpc.payment.verify.useMutation({ sessionId });
// Returns: { status: "PAID" | "PENDING" | "FAILED" | "CANCELLED" }
```

### 3. Webhook Handler (`backend/hono-webhooks.ts`)
Receives payment notifications from Arifpay at `/api/webhooks/arifpay`

## Setup Instructions

### 1. Get Arifpay Credentials
1. Sign up at [Arifpay Dashboard](https://gateway.arifpay.net)
2. Get your API Key
3. Get your Account Number for payments

### 2. Configure Environment Variables
Create `.env` file in your project root:

```bash
ARIFPAY_API_KEY=your_arifpay_api_key_here
ARIFPAY_ACCOUNT_NUMBER=your_account_number_here
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### 3. Update Frontend to Use Arifpay

#### In `app/premium.tsx`:
```typescript
const upgradeMutation = trpc.membership.upgrade.useMutation();

const handleUpgrade = async () => {
  const result = await upgradeMutation.mutateAsync({
    tier: selectedTier,
    returnUrl: Linking.createURL('/'),
  });

  if (result.requiresPayment) {
    // Open Arifpay checkout URL
    await WebBrowser.openBrowserAsync(result.checkoutUrl);
  }
};
```

#### In `app/payment-verification.tsx`:
```typescript
const verifyMutation = trpc.payment.verify.useMutation();

useEffect(() => {
  const sessionId = searchParams.get('sessionId');
  if (sessionId) {
    verifyMutation.mutate({ sessionId });
  }
}, []);
```

## Payment Flow

### 1. User Initiates Payment
```
User clicks "Upgrade" → tRPC creates checkout → Returns checkoutUrl
```

### 2. User Completes Payment
```
Open checkoutUrl → User pays via Telebirr/etc → Arifpay processes
```

### 3. Callback Handling
```
Success: /payment-verification?status=success&sessionId=xxx
Cancel: /payment-verification?status=cancelled
Error: /payment-verification?status=error
```

### 4. Verification
```
App calls payment.verify → Backend checks with Arifpay → Update user tier
```

## Arifpay API Endpoints Used

```typescript
// Create Checkout
POST https://gateway.arifpay.net/api/checkout/create
Headers: { Authorization: "Bearer {API_KEY}" }
Body: { amount, currency, beneficiaries, successUrl, cancelUrl, errorUrl, notifyUrl }

// Verify Payment  
GET https://gateway.arifpay.net/api/checkout/verify/{sessionId}
Headers: { Authorization: "Bearer {API_KEY}" }

// Cancel Checkout
POST https://gateway.arifpay.net/api/checkout/cancel/{sessionId}
Headers: { Authorization: "Bearer {API_KEY}" }
```

## Testing

### Test Payment Flow:
1. Start your app: `npm start`
2. Navigate to Premium screen
3. Select a tier (Silver/Gold/VIP)
4. Click "Upgrade"
5. Complete payment in Arifpay checkout
6. Verify callback and tier update

### Test Webhook (Local):
Use ngrok or similar to expose your local backend:
```bash
ngrok http 8081
# Update notifyUrl in checkout to: https://xxx.ngrok.io/api/webhooks/arifpay
```

## Important Notes

⚠️ **Production Checklist:**
- [ ] Replace `ARIFPAY_ACCOUNT_NUMBER` with your real account
- [ ] Use production API keys (not sandbox)
- [ ] Implement proper error handling
- [ ] Add database logging for transactions
- [ ] Implement idempotency for webhook processing
- [ ] Add retry logic for failed verifications
- [ ] Store transaction history in Supabase

## Next Steps

1. **Update Frontend**: Modify `premium.tsx` to call tRPC mutations and open WebBrowser
2. **Database Schema**: Add `transactions` table to store payment records
3. **Admin Panel**: Create admin interface to view/manage payments
4. **Email Notifications**: Send receipts after successful payments
5. **Refund System**: Implement refund handling

## Support

- Arifpay Docs: https://developer.arifpay.net
- Your Backend API: `http://localhost:8081/api`
- tRPC Endpoint: `http://localhost:8081/api/trpc`
