# CBE Direct Payment Integration Guide

## Overview
This app uses **ArifPay CBE Direct Payment V2** - a single-request integration that creates a session and triggers the payment popup in one call.

## Why CBE V2?
✅ Simpler integration (one API call)  
✅ Fewer steps for users  
✅ Faster implementation  
✅ Perfect for starters  

## Implementation

### 1. Backend Configuration (`backend/lib/arifpay.ts`)

The `ArifpayClient` handles all payment operations:

```typescript
// For CBE payments, it uses this endpoint:
POST https://gateway.arifpay.org/api/sandbox/checkout/v2/cbe/direct/transfer

// Headers
x-arifpay-key: YOUR_API_KEY
Content-Type: application/json
```

### 2. Payment Flow

```
User clicks "Upgrade" 
    ↓
Frontend calls tRPC mutation
    ↓
Backend creates CBE payment session
    ↓
ArifPay returns payment URL
    ↓
Frontend opens URL in browser
    ↓
User completes payment in CBE popup
    ↓
ArifPay sends webhook
    ↓
Backend updates membership
```

### 3. Required Fields

| Field | Format | Example |
|-------|--------|---------|
| phone | 251xxxxxxxxx (no +251) | 251954926213 |
| email | any valid email | user@app.com |
| nonce | unique per request | userId-uuid |
| expireDate | ISO 8601 (future) | 2025-02-01T03:45:27 |
| paymentMethods | ["CBE"] | ["CBE"] |
| items | array of items | See below |
| beneficiaries | bank account info | See below |

### 4. Request Payload Example

```json
{
  "cancelUrl": "http://localhost:8081/payment-cancel",
  "errorUrl": "http://localhost:8081/payment-error",
  "notifyUrl": "http://localhost:8081/webhooks/arifpay",
  "successUrl": "http://localhost:8081/payment-success",
  "phone": "251954926213",
  "email": "user@app.com",
  "nonce": "phone-user-uuid-12345",
  "expireDate": "2025-12-31T23:59:59",
  "paymentMethods": ["CBE"],
  "lang": "EN",
  "items": [
    {
      "name": "Dating App - SILVER Membership",
      "description": "Premium silver membership subscription",
      "quantity": 1,
      "price": 1600,
      "image": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300"
    }
  ],
  "beneficiaries": [
    {
      "accountNumber": "01320811436100",
      "bank": "AWINETAA",
      "amount": 1600
    }
  ]
}
```

### 5. Response Format

#### Success Response (200 OK)
```json
{
  "error": false,
  "msg": "No Errors",
  "data": {
    "sessionId": "ED54BDB4D5BF2D",
    "paymentUrl": "https://checkout.arifpay.org/checkout/ED54BDB4D5BF2D",
    "cancelUrl": "https://gateway.arifpay.org/v0/checkout/session/cancelED54BDB4D5BF2D",
    "totalAmount": 1600.0,
    "status": "PENDING"
  }
}
```

#### Error Response (400/500)
```json
{
  "error": true,
  "msg": "Error description"
}
```

### 6. Webhook Notification

When payment completes, ArifPay sends POST to `notifyUrl`:

```json
{
  "uuid": "ED54BDB4D5BF2D",
  "nonce": "phone-user-uuid-12345",
  "phone": "251954926213",
  "paymentMethod": "CBE",
  "totalAmount": 1600,
  "transactionStatus": "SUCCESS",
  "transaction": {
    "transactionId": "RECEIPT_12345",
    "transactionStatus": "SUCCESS"
  },
  "notificationUrl": "http://localhost:8081/webhooks/arifpay",
  "sessionId": "ED54BDB4D5BF2D"
}
```

**Important:** Your webhook endpoint must:
- Accept POST requests
- Return HTTP 200 status
- Handle idempotency (same webhook may arrive multiple times)

### 7. Transaction Status Codes

| Status | Meaning |
|--------|---------|
| PENDING | Payment initiated, waiting |
| SUCCESS | Payment completed ✅ |
| FAILED | Payment failed ❌ |
| CANCELED | User canceled |
| EXPIRED | Session timed out |

## Testing

### Sandbox Environment
```bash
Base URL: https://gateway.arifpay.org/api/sandbox
API Key: hxsMUuBvV4j3ONdDif4SRSo2cKPrMoWY (from env)
```

### Test Credentials
```
Phone: 251954926213
Email: Test@gmail.com
Password (for CBE popup): cbe123 (in test mode)
```

### Test Flow
1. Start your dev server
2. Go to Premium screen
3. Select Silver/Gold/VIP tier
4. Choose "CBE Bank" payment method
5. Click "Upgrade to [Tier]"
6. Payment URL opens in browser
7. Enter test credentials
8. Complete payment
9. Check webhook logs
10. Verify membership updated

## Pricing

Current tier prices (in ETB):
- Free: 0 ETB
- Silver: 1,600 ETB (10 USD × 160)
- Gold: 3,200 ETB (20 USD × 160)
- VIP: 4,800 ETB (30 USD × 160)

Configured in: `backend/trpc/routes/membership/upgrade/route.ts`

## Troubleshooting

### Issue: "Invalid response from ArifPay"
- Check API key is correct
- Verify base URL is for sandbox
- Check network connectivity

### Issue: "Phone number format error"
- Must be 251xxxxxxxxx
- No spaces, no +251
- Auto-normalized in code

### Issue: "Webhook not received"
- Check webhook URL is accessible
- Verify POST endpoint exists
- Check firewall settings
- In local dev, use ngrok/tunnel

### Issue: "Payment URL doesn't open"
- Check popup blocker (web)
- Verify Linking permission (mobile)
- Try WebBrowser.openBrowserAsync

## Code Locations

| Feature | File |
|---------|------|
| ArifPay Client | `backend/lib/arifpay.ts` |
| Membership Upgrade | `backend/trpc/routes/membership/upgrade/route.ts` |
| Frontend UI | `app/premium.tsx` |
| Webhook Handler | `backend/hono-webhooks.ts` |
| Payment Success | `app/payment-success.tsx` |
| Payment Cancel | `app/payment-cancel.tsx` |
| Payment Error | `app/payment-error.tsx` |

## Environment Variables

Required in `.env`:
```bash
ARIFPAY_API_KEY=hxsMUuBvV4j3ONdDif4SRSo2cKPrMoWY
ARIFPAY_ACCOUNT_NUMBER=01320811436100
ARIFPAY_BASE_URL=https://gateway.arifpay.org/api/sandbox
EXPO_PUBLIC_API_URL=http://localhost:8081
```

## Going to Production

When ready for production:

1. **Get Production Credentials**
   - Contact ArifPay support
   - Get production API key
   - Get verified account number

2. **Update Environment**
   ```bash
   ARIFPAY_BASE_URL=https://gateway.arifpay.org/api  # Remove /sandbox
   ARIFPAY_API_KEY=your_production_key
   ARIFPAY_ACCOUNT_NUMBER=your_verified_account
   ```

3. **Update URLs**
   - Use production domain
   - Enable HTTPS
   - Configure proper webhook endpoint

4. **Test Thoroughly**
   - Small amount first
   - Verify webhooks
   - Test all status codes
   - Check refund process

## Support

- **ArifPay Docs:** https://developer.arifpay.net/
- **Email:** support@arifpay.com  
- **Response Time:** Within 1 business day
- **Available:** 24/7 for urgent issues

## Security Notes

⚠️ **Never expose API keys in frontend code**  
⚠️ **Always validate webhook signatures**  
⚠️ **Use HTTPS in production**  
⚠️ **Store sensitive data securely**  
⚠️ **Implement rate limiting**  
⚠️ **Log all transactions**  

---

**Last Updated:** 2025-01-07  
**Version:** 1.0  
**Integration Type:** CBE Direct Payment V2
