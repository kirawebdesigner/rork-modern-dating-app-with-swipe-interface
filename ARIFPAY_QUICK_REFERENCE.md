# ArifPay Integration Quick Reference

## Overview
Your dating app now integrates with ArifPay for secure payment processing in Ethiopia.

## Supported Payment Methods
- 📱 **TeleBirr** - Mobile money
- 🏦 **CBE Birr** - Commercial Bank of Ethiopia
- 💳 **Amole** - Mobile wallet
- 💰 **M-PESA** - Mobile money

## Pricing (ETB)
- **Silver**: 1,600 ETB/month ($10 USD)
- **Gold**: 3,200 ETB/month ($20 USD)  
- **VIP**: 4,800 ETB/month ($30 USD)

## API Endpoints Used

### 1. Create Checkout Session
```
POST https://gateway.arifpay.org/api/sandbox/checkout/session
Headers:
  Content-Type: application/json
  x-arifpay-key: YOUR_API_KEY

Body:
{
  "phone": "251912345678",
  "email": "user@app.com",
  "nonce": "unique-transaction-id",
  "cancelUrl": "https://yourapp.com/payments/cancel",
  "errorUrl": "https://yourapp.com/payments/error",
  "successUrl": "https://yourapp.com/payments/success",
  "notifyUrl": "https://yourapp.com/webhooks/arifpay",
  "expireDate": "2025-11-03T15:30:00",
  "paymentMethods": ["TELEBIRR"],
  "lang": "EN",
  "items": [{
    "name": "Dating App - VIP Membership",
    "quantity": 1,
    "price": 4800
  }],
  "beneficiaries": [{
    "accountNumber": "0944120739",
    "bank": "ARIFPAY",
    "amount": 4800
  }]
}

Response:
{
  "error": false,
  "msg": "No Errors",
  "data": {
    "sessionId": "ED54BDB4D5BF2D",
    "paymentUrl": "https://checkout.arifpay.org/checkout/ED54BDB4D5BF2D",
    "cancelUrl": "https://gateway.arifpay.org/v0/checkout/session/cancelED54BDB4D5BF2D",
    "totalAmount": 4800
  }
}
```

### 2. Verify Payment Status
```
GET https://gateway.arifpay.org/api/sandbox/ms/transaction/status/{sessionId}
Headers:
  x-arifpay-key: YOUR_API_KEY

Response:
{
  "error": false,
  "msg": "No Errors",
  "data": {
    "sessionId": "ED54BDB4D5BF2D",
    "status": "SUCCESS",
    "totalAmount": 4800,
    "transactionId": "TXN123456",
    "paidAt": "2025-11-02T10:30:00Z"
  }
}
```

## Payment Status Codes

| Status | Description | Action |
|--------|-------------|--------|
| **SUCCESS** | Payment completed ✅ | Upgrade user membership |
| **PENDING** | Payment processing ⏳ | Wait for webhook |
| **FAILED** | Payment failed ❌ | Show error to user |
| **CANCELED** | User canceled 🚫 | Return to upgrade page |
| **EXPIRED** | Session timed out ⌛ | Create new session |

## Webhook Integration

### Webhook Endpoint
```
POST /webhooks/arifpay
```

### Webhook Payload
```json
{
  "uuid": "SESSION_ID",
  "nonce": "NONCE_VALUE",
  "phone": "251911111111",
  "status": "SUCCESS",
  "transactionId": "TXN123456",
  "amount": 4800,
  "currency": "ETB"
}
```

### Webhook Handler Logic
1. Receive webhook notification
2. Extract sessionId and status
3. If status is SUCCESS:
   - Verify payment with ArifPay API
   - Extract userId from sessionId
   - Update membership tier in database
   - Set expiration date (30 days)
4. Return 200 OK

## Phone Number Format
ArifPay requires phone numbers in this format:
- ✅ `251912345678` (correct)
- ❌ `+251912345678` (wrong - no +)
- ❌ `0912345678` (wrong - needs 251)

Your app automatically converts:
- `0912345678` → `251912345678`
- `+251912345678` → `251912345678`

## Required Fields Checklist

When creating a checkout session, ALL fields are required:

- [x] `phone` - User phone (251 format)
- [x] `email` - User email  
- [x] `nonce` - Unique transaction ID
- [x] `cancelUrl` - Where to redirect on cancel
- [x] `errorUrl` - Where to redirect on error
- [x] `successUrl` - Where to redirect on success
- [x] `notifyUrl` - Webhook URL
- [x] `expireDate` - When session expires (future date)
- [x] `paymentMethods` - Array of methods
- [x] `lang` - Language (EN)
- [x] `items` - Array of items to purchase
- [x] `beneficiaries` - Who receives payment

⚠️ **Important:** The `beneficiaries.amount` must equal the total of `items[].price × items[].quantity`

## Testing

### Sandbox Mode
- Use sandbox API: `https://gateway.arifpay.org/api/sandbox`
- Test payments won't charge real money
- Use test payment credentials from ArifPay

### Production Mode
- Use production API: `https://gateway.arifpay.org/api`
- Real money will be charged
- Update `ARIFPAY_BASE_URL` in env

## Common Issues & Solutions

### 1. "Failed to fetch" Error
**Cause:** Backend not reachable
**Fix:**
- Check backend is running
- Verify API URL is correct
- Check internet connection
- Test with curl

### 2. "Invalid phone number" Error
**Cause:** Phone format incorrect
**Fix:** Ensure phone starts with 251

### 3. Payment URL doesn't open
**Cause:** Browser blocked popup
**Fix:** Allow popups for your domain

### 4. Webhook not received
**Cause:** URL not accessible
**Fix:**
- Use ngrok or tunnel for local testing
- Ensure webhook URL is public
- Check firewall settings

### 5. Membership not updated
**Cause:** Webhook handler error
**Fix:**
- Check webhook logs
- Verify phone matches profile
- Check Supabase connection

## Security Best Practices

1. **Never expose API key** in frontend code
2. **Always verify payments** server-side
3. **Use HTTPS** for all webhook URLs
4. **Validate webhook** payload before processing
5. **Log all transactions** for audit trail
6. **Set reasonable expiration** times (24 hours)
7. **Handle duplicate** webhook calls gracefully

## ArifPay Dashboard

Access your ArifPay dashboard at: https://dashboard.arifpay.org

Features:
- View all transactions
- Configure payment methods
- Download reports
- Manage API keys
- Set up webhooks

## Support

- **ArifPay Support:** support@arifpay.com
- **Documentation:** https://docs.arifpay.com
- **Status Page:** https://status.arifpay.com

## Environment Setup

### Development
```bash
ARIFPAY_API_KEY=sandbox_key_here
ARIFPAY_BASE_URL=https://gateway.arifpay.org/api/sandbox
ARIFPAY_ACCOUNT_NUMBER=0944120739
```

### Production
```bash
ARIFPAY_API_KEY=production_key_here
ARIFPAY_BASE_URL=https://gateway.arifpay.org/api
ARIFPAY_ACCOUNT_NUMBER=your_production_account
```

## Rate Limits

ArifPay API rate limits:
- **Sandbox:** 100 requests/minute
- **Production:** 1000 requests/minute

If you hit rate limits:
- Implement exponential backoff
- Cache responses where possible
- Contact ArifPay for higher limits

## Transaction Flow Diagram

```
User                    Your App                Backend                 ArifPay
  |                        |                      |                      |
  |---Click Upgrade------->|                      |                      |
  |                        |---Create Payment---->|                      |
  |                        |                      |---Create Session---->|
  |                        |                      |<--Payment URL--------|
  |                        |<--Payment URL--------|                      |
  |<--Open Browser---------|                      |                      |
  |                                                                       |
  |---Complete Payment----------------------------------------->|
  |<--Redirect to Success-----------------------------------------|
  |                                                                       |
  |                                               |<--Webhook------|
  |                                               |---Verify------>|
  |                                               |<--Status-------|
  |                                               |                      |
  |                        |<--Tier Updated-------|                      |
  |<--Show Success---------|                      |                      |
```

## Monitoring

Track these metrics:
- Payment success rate
- Average payment completion time
- Failed payment reasons
- Webhook delivery rate
- User tier distribution

## Quick Test Commands

### Test ArifPay API Connection
```bash
curl -X GET \
  https://gateway.arifpay.org/api/sandbox/health \
  -H 'x-arifpay-key: YOUR_API_KEY'
```

### Test Webhook Delivery
```bash
curl -X POST \
  https://your-domain.com/webhooks/arifpay \
  -H 'Content-Type: application/json' \
  -d '{
    "sessionId": "TEST123",
    "status": "SUCCESS",
    "amount": 4800
  }'
```

## Checklist Before Going Live

- [ ] Test all payment methods
- [ ] Verify webhook endpoint is accessible
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configure production API keys
- [ ] Test payment cancellation
- [ ] Test payment failure scenarios
- [ ] Set up transaction logging
- [ ] Configure email notifications
- [ ] Test membership expiration
- [ ] Document customer support process
- [ ] Set up refund process
- [ ] Test on real mobile devices
- [ ] Verify SSL certificate is valid
- [ ] Test with different network conditions
- [ ] Set up backup payment gateway (optional)

---

**Last Updated:** 2025-11-02  
**Integration Version:** 1.0  
**ArifPay API Version:** v1
