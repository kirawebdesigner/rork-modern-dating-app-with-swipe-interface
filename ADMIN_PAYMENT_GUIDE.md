# Admin Guide: Manual Payment Verification (Phone-Based)

## Overview
This guide explains how to manually verify and approve Telebirr payments for membership upgrades using phone numbers as the primary identifier.

## Payment Flow
1. User selects a membership plan (Silver, Gold, or VIP)
2. User pays via Telebirr to: **0944120739** (Tesnim meftuh)
3. User sends payment screenshot + their registered phone number via Telegram to **0944120739**
4. Admin verifies payment and upgrades user in Supabase

## Pricing
- **Silver**: 1,598 ETB/month ($9.99 × 160)
- **Gold**: 3,198 ETB/month ($19.99 × 160)
- **VIP**: 4,798 ETB/month ($29.99 × 160)

## How to Verify and Approve Payments

### Step 1: Receive Payment Proof
User will send you via Telegram:
- Screenshot of Telebirr payment
- Their phone number (e.g., "0944120739")

### Step 2: Verify Payment
1. Check the screenshot shows correct amount
2. Verify payment was made to your Telebirr account
3. Note the user's phone number

### Step 3: Upgrade User in Supabase

#### Option A: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **Table Editor** → **memberships** table
3. Find the user by their phone number:
   - First, go to **profiles** table
   - Search for the phone number in the `phone` column
   - Copy the user's `id` (UUID)
4. Go back to **memberships** table
5. Find the row where `user_id` matches the copied UUID
6. Click **Edit** on that row
7. Update the following fields:
   - `tier`: Change to `silver`, `gold`, or `vip`
   - `expires_at`: Set to 30 days from now (e.g., `2025-11-02 00:00:00+00`)
8. Click **Save**

#### Option B: Using SQL Editor
1. Go to **SQL Editor** in Supabase
2. Run this query to upgrade a user:

```sql
-- Find user by phone number and upgrade to GOLD
UPDATE memberships m
SET 
  tier = 'gold',
  expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
FROM profiles p
WHERE p.phone = '0944120739'  -- Replace with user's phone number
  AND m.user_id = p.id;
```

**For different tiers:**
```sql
-- Silver
UPDATE memberships m
SET tier = 'silver', expires_at = NOW() + INTERVAL '30 days', updated_at = NOW()
FROM profiles p
WHERE p.phone = 'USER_PHONE_HERE' AND m.user_id = p.id;

-- Gold
UPDATE memberships m
SET tier = 'gold', expires_at = NOW() + INTERVAL '30 days', updated_at = NOW()
FROM profiles p
WHERE p.phone = 'USER_PHONE_HERE' AND m.user_id = p.id;

-- VIP
UPDATE memberships m
SET tier = 'vip', expires_at = NOW() + INTERVAL '30 days', updated_at = NOW()
FROM profiles p
WHERE p.phone = 'USER_PHONE_HERE' AND m.user_id = p.id;
```

### Step 4: Confirm with User
Send a message back to the user on Telegram:
> "✅ Payment confirmed! Your [TIER] membership is now active. Thank you!"

## Checking User's Current Membership

To check a user's current membership status:

```sql
SELECT 
  p.phone,
  p.name,
  m.tier,
  m.expires_at,
  m.message_credits,
  m.boost_credits
FROM profiles p
JOIN memberships m ON m.user_id = p.id
WHERE p.phone = 'USER_PHONE_HERE';
```

## Troubleshooting

### User not found by phone number
- Ask user to confirm their registered phone number
- Check if they used a different format (with/without country code)
- Search in profiles table manually

### Payment amount doesn't match
- Verify which plan they selected
- Check if exchange rate changed
- Contact user for clarification

### User already has active membership
- Check `expires_at` date
- If extending, add 30 days to current `expires_at`:
```sql
UPDATE memberships m
SET 
  tier = 'gold',
  expires_at = GREATEST(expires_at, NOW()) + INTERVAL '30 days',
  updated_at = NOW()
FROM profiles p
WHERE p.phone = 'USER_PHONE_HERE' AND m.user_id = p.id;
```

## Important Notes

1. **Always verify payment before upgrading** - Check your Telebirr account
2. **Phone number is the key identifier** - Make sure it matches exactly
3. **Set expiration date** - Memberships should expire after 30 days
4. **Keep records** - Save payment screenshots for your records
5. **Response time** - Try to approve within 12 hours as promised

## Quick Reference SQL Queries

### Find all pending payments (users who messaged but not upgraded)
This requires manual tracking via Telegram messages.

### Find all active premium members
```sql
SELECT 
  p.phone,
  p.name,
  m.tier,
  m.expires_at
FROM profiles p
JOIN memberships m ON m.user_id = p.id
WHERE m.tier != 'free'
  AND (m.expires_at IS NULL OR m.expires_at > NOW())
ORDER BY m.expires_at DESC;
```

### Find expired memberships that need downgrade
```sql
SELECT 
  p.phone,
  p.name,
  m.tier,
  m.expires_at
FROM profiles p
JOIN memberships m ON m.user_id = p.id
WHERE m.tier != 'free'
  AND m.expires_at < NOW();
```

To downgrade them:
```sql
UPDATE memberships m
SET tier = 'free', expires_at = NULL, updated_at = NOW()
FROM profiles p
WHERE m.tier != 'free'
  AND m.expires_at < NOW()
  AND m.user_id = p.id;
```

## Support

If you encounter any issues:
1. Check the database schema in `database-schema.sql`
2. Verify all tables exist and have correct structure
3. Check Supabase logs for any errors
4. Contact technical support if needed

---

**Remember**: Phone number is the primary identifier. Always ask users for their registered phone number when processing payments.
