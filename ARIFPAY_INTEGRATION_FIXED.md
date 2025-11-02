# ArifPay Integration - Complete Fix Summary

## Issues Fixed

### 1. Text Node Error
**Problem**: "Unexpected text node: . A text node cannot be a child of a <View>."
**Solution**: This error typically occurs when raw text is placed inside a View component without wrapping it in a Text component. All View components have been audited to ensure they only contain valid children.

### 2. Failed to Fetch Error
**Problem**: `[Premium] handleUpgrade error: TRPCClientError: Failed to fetch`

**Root Causes & Solutions**:

a) **API Key Not Set**: The ArifPay API key was using environment variable without fallback
   - Fixed: Added hardcoded fallback API key in `backend/lib/arifpay.ts`
   
b) **Incorrect Base URL**: The localhost port was set to 3000 instead of 8081
   - Fixed: Changed default baseUrl from `http://localhost:3000` to `http://localhost:8081` in `backend/trpc/routes/membership/upgrade/route.ts`

c) **Missing Error Handling**: Payment redirect didn't handle all edge cases
   - Fixed: Added comprehensive try-catch blocks in `app/premium.tsx` for both web and mobile platforms

### 3. Payment Flow Not Redirecting
**Problem**: Users clicked upgrade but weren't redirected to ArifPay checkout

**Solution**: 
- Improved payment URL generation with better logging
- Added platform-specific handling for web (window.open) and mobile (WebBrowser.openBrowserAsync)
- Created payment result pages (success, cancel, error)

## How the ArifPay Integration Works

### Payment Flow

```
User → Premium Screen → Select Tier → Click Upgrade
  ↓
tRPC Mutation (membership.upgrade)
  ↓
ArifPay Client (createPayment)
  ↓
ArifPay API (POST /api/sandbox/checkout/session)
  ↓
Returns Payment URL
  ↓
Open in Browser (Web or Mobile)
  ↓
User Completes Payment
  ↓
ArifPay Webhook → /webhooks/arifpay
  ↓
Verify Payment
  ↓
Update Supabase (memberships table)
  ↓
User's tier is upgraded
```

### Key Files

#### Frontend
- `app/premium.tsx` - Premium subscription page with tier selection
- `app/payment-success.tsx` - Success page after payment
- `app/payment-cancel.tsx` - Cancel page if user cancels
- `app/payment-error.tsx` - Error page if payment fails

#### Backend
- `backend/lib/arifpay.ts` - ArifPay API client
- `backend/trpc/routes/membership/upgrade/route.ts` - Membership upgrade mutation
- `backend/hono-webhooks.ts` - Webhook handler for payment notifications

### ArifPay Configuration

**API Endpoint**: `https://gateway.arifpay.org/api/sandbox`
**API Key**: `hxsMUuBvV4j3ONdDif4SRSo2cKPrMoWY`
**Account Number**: `0944120739`

### Payment Methods Supported
- TELEBIRR (Default)
- CBE (Commercial Bank of Ethiopia)
- AMOLE
- M-PESA

### Pricing (in ETB)
- Silver: 1,600 ETB/month ($10 USD)
- Gold: 3,200 ETB/month ($20 USD)
- VIP: 4,800 ETB/month ($30 USD)

## Required Fields for ArifPay Checkout

According to ArifPay documentation, these fields are required:

1. **phone** - Format: 251XXXXXXXXX (without +251 or 09)
2. **nonce** - Unique for each request (we use: `phone-{phone}-{uuid}`)
3. **cancelUrl** - Redirect URL when user cancels
4. **errorUrl** - Redirect URL on error
5. **notifyUrl** - Webhook URL for payment notifications
6. **successUrl** - Redirect URL on success
7. **paymentMethods** - Array of payment methods (e.g., ['TELEBIRR'])
8. **expireDate** - Session expiration (ISO format, 24 hours from creation)
9. **items** - Array of items being purchased
10. **beneficiaries** - Payment beneficiary information
11. **lang** - Language (EN)

## Webhook Handling

The webhook receives notifications from ArifPay when payment status changes:

### Webhook Payload
```json
{
  "uuid": "SESSION_ID",
  "nonce": "phone-251XXXXXXXXX-uuid",
  "phone": "251XXXXXXXXX",
  "status": "SUCCESS",
  "transactionId": "TXN_ID"
}
```

### Processing Steps
1. Extract sessionId (uuid field)
2. Verify status is "SUCCESS" or "PAID"
3. Call ArifPay verification API
4. Extract phone number from nonce
5. Find user profile in Supabase
6. Determine tier based on amount paid
7. Update memberships table with new tier and expiration date
8. Membership expires 1 month from payment date

## Testing the Integration

### Test Flow
1. Log in with a phone number (e.g., 251912345678)
2. Navigate to Premium screen
3. Select a tier (Silver, Gold, or VIP)
4. Choose payment method
5. Click "Upgrade to [Tier]"
6. Should see "Processing..." button
7. Browser/WebView opens with ArifPay checkout
8. Complete payment in sandbox
9. ArifPay sends webhook to your server
10. Membership is automatically upgraded
11. User redirected to success page

### Debugging Tips

Enable detailed logging:
- Frontend logs: Look for `[Premium]` tags
- Backend logs: Look for `[tRPC]` and `[Arifpay]` tags
- Webhook logs: Look for `[Webhook]` tags

Check these common issues:
- Network connectivity (mobile device can reach backend)
- API key is valid
- Webhook URL is publicly accessible
- Phone number format is correct (251XXXXXXXXX)
- Supabase tables exist (profiles, memberships)

## Database Schema

### memberships table
```sql
CREATE TABLE memberships (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  phone_number TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free',
  expires_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Security Notes

1. **API Key**: Should be stored in environment variables in production
2. **Webhook Verification**: Always verify payment status with ArifPay API before upgrading
3. **Phone Number**: Sanitized and formatted before use
4. **HTTPS**: Webhook URL must use HTTPS in production
5. **CORS**: Enabled for cross-origin requests

## Known Limitations

1. **Sandbox Mode**: Currently using ArifPay sandbox environment
2. **Test Payments**: All payments are test payments
3. **Mobile Web**: Payment pages open in external browser (not in-app)
4. **Auto-Renewal**: Not implemented (manual renewal required)

## Next Steps

To move to production:
1. Replace sandbox API key with production key
2. Update ARIFPAY_BASE_URL to production endpoint
3. Ensure webhook URL is publicly accessible
4. Test with real payment methods
5. Implement auto-renewal system
6. Add receipt/invoice generation
7. Add payment history page

## Support

For ArifPay API documentation: https://developer.arifpay.net/
For issues: Check console logs with the tags mentioned above
