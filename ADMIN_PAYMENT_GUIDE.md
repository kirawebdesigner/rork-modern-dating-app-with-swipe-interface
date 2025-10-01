# Admin Guide: Manual Telebirr Payment Verification

## Overview
This guide explains how to manually verify and approve Telebirr payments for membership upgrades.

## Payment Flow
1. User selects a plan (Silver, Gold, or VIP) in the app
2. User clicks "Upgrade" and is redirected to payment verification page
3. User sees:
   - Telebirr number: **0944120739**
   - Account name: **Tesnim meftuh**
   - Amount to pay (in ETB)
   - Instructions to send screenshot + email via Telegram
4. User pays via Telebirr and sends proof to **0944120739** on Telegram
5. Admin (you) verifies payment and upgrades user in Supabase

## Pricing (ETB)
- **Silver**: 1,598 ETB/month (9.99 USD × 160)
- **Gold**: 3,198 ETB/month (19.99 USD × 160)
- **VIP**: 4,798 ETB/month (29.99 USD × 160)

Yearly plans are 50% off (6 months price for 12 months).

## How to Approve Payments in Supabase

### Step 1: Get User Email
When a user sends you payment proof on Telegram, they should include their **app account email or phone number**.

### Step 2: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

### Step 3: Verify Payment Screenshot
Check the Telebirr screenshot to confirm:
- Payment amount matches the plan
- Payment went to 0944120739
- Transaction is recent

### Step 4: Upgrade User to SILVER
```sql
-- Replace 'user@example.com' with the actual user email
UPDATE public.memberships m
SET 
  tier = 'silver',
  expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
FROM public.profiles p
WHERE p.email = 'user@example.com' 
  AND m.user_id = p.id;
```

### Step 5: Upgrade User to GOLD
```sql
-- Replace 'user@example.com' with the actual user email
UPDATE public.memberships m
SET 
  tier = 'gold',
  expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
FROM public.profiles p
WHERE p.email = 'user@example.com' 
  AND m.user_id = p.id;
```

### Step 6: Upgrade User to VIP
```sql
-- Replace 'user@example.com' with the actual user email
UPDATE public.memberships m
SET 
  tier = 'vip',
  expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
FROM public.profiles p
WHERE p.email = 'user@example.com' 
  AND m.user_id = p.id;
```

### For Yearly Plans
Replace `INTERVAL '30 days'` with `INTERVAL '365 days'` in the queries above.

Example for yearly GOLD:
```sql
UPDATE public.memberships m
SET 
  tier = 'gold',
  expires_at = NOW() + INTERVAL '365 days',
  updated_at = NOW()
FROM public.profiles p
WHERE p.email = 'user@example.com' 
  AND m.user_id = p.id;
```

## If User Signed Up with Phone Number

If the user provides a phone number instead of email:

```sql
-- Replace '+251944120739' with the actual user phone
UPDATE public.memberships m
SET 
  tier = 'gold',
  expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
FROM public.profiles p
WHERE p.phone = '+251944120739' 
  AND m.user_id = p.id;
```

## Verify the Upgrade Worked

After running the query, verify it worked:

```sql
-- Check user's current tier
SELECT p.email, p.phone, p.name, m.tier, m.expires_at
FROM public.profiles p
JOIN public.memberships m ON m.user_id = p.id
WHERE p.email = 'user@example.com' OR p.phone = '+251944120739';
```

You should see the updated tier and expiration date.

## Common Issues

### Issue: "No rows updated"
**Solution**: The email/phone doesn't exist in the database. Ask the user to confirm their account details.

### Issue: User says upgrade didn't work
**Solution**: 
1. Verify the query ran successfully (check for "UPDATE 1" message)
2. Ask user to log out and log back in
3. Check if the user's app is connected to the correct Supabase instance

### Issue: User wants a refund
**Solution**: Process Telebirr refund and run:
```sql
UPDATE public.memberships m
SET 
  tier = 'free',
  expires_at = NULL,
  updated_at = NOW()
FROM public.profiles p
WHERE p.email = 'user@example.com' 
  AND m.user_id = p.id;
```

## Record Keeping

Keep a simple log of approved payments:
- Date
- User email/phone
- Plan (Silver/Gold/VIP)
- Duration (Monthly/Yearly)
- Amount paid (ETB)
- Telebirr transaction ID (from screenshot)

This helps with accounting and dispute resolution.

## Support Response Template

When user sends payment proof on Telegram:

```
✅ Payment verified! 
Your account has been upgraded to [PLAN].
Please log out and log back in to see your new features.
Expires: [DATE]

Thank you for your support! 🎉
```

## Emergency: Downgrade User

If you need to downgrade a user (e.g., payment dispute):

```sql
UPDATE public.memberships m
SET 
  tier = 'free',
  expires_at = NULL,
  updated_at = NOW()
FROM public.profiles p
WHERE p.email = 'user@example.com' 
  AND m.user_id = p.id;
```

## Questions?

If you encounter any issues with this process, check:
1. Supabase connection is working
2. User exists in the database
3. SQL query syntax is correct (no typos in email/phone)
4. User has logged out and back in after upgrade

---

**Important**: Always verify payment screenshots before upgrading accounts. Never upgrade without proof of payment.
