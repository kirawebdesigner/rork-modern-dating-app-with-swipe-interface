# Admin Upgrade Guide for Zewijuna

This guide explains how to manually upgrade users after they send Telebirr payment confirmation.

## Prerequisites

1. Access to Supabase Dashboard
2. SQL Editor access in Supabase
3. User's phone number from payment confirmation

---

## Step 1: Verify Payment

When a user sends payment confirmation via Telegram:
1. Verify the Telebirr transaction screenshot
2. Note the user's phone number
3. Note the plan they paid for (Silver, Gold, or VIP)

---

## Step 2: Upgrade User in Supabase

### Option A: Using SQL Editor (Recommended)

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste one of the queries below
3. Replace `'USER_PHONE_HERE'` with the actual phone number
4. Replace `'gold'` with the tier: `'silver'`, `'gold'`, or `'vip'`
5. Click "Run"

#### Upgrade for 30 Days

```sql
UPDATE public.memberships m
SET 
  tier = 'gold',
  expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
FROM public.profiles p
WHERE p.phone = '0944000000' 
  AND m.user_id = p.id;
```

#### Extend Existing Membership (Add 30 Days)

If user already has an active plan and wants to extend:

```sql
UPDATE public.memberships m
SET 
  tier = 'gold',
  expires_at = GREATEST(COALESCE(expires_at, NOW()), NOW()) + INTERVAL '30 days',
  updated_at = NOW()
FROM public.profiles p
WHERE p.phone = '0944000000' 
  AND m.user_id = p.id;
```

---

## Step 3: Verify Upgrade

Run this query to confirm the upgrade worked:

```sql
SELECT 
  p.phone,
  p.name,
  m.tier,
  m.expires_at,
  CASE 
    WHEN m.expires_at IS NULL THEN 'No expiration'
    WHEN m.expires_at > NOW() THEN 'Active ✅'
    ELSE 'Expired ❌'
  END as status
FROM public.profiles p
JOIN public.memberships m ON m.user_id = p.id
WHERE p.phone = '0944000000';
```

Expected result:
- `tier` should show the new plan (silver/gold/vip)
- `expires_at` should show a date 30 days in the future
- `status` should show "Active ✅"

---

## Step 4: User Receives Notification

**Automatically**, the user will receive a real-time notification in the app:

> **"Account Upgraded! 🎉"**  
> Your account has been upgraded to GOLD plan. Thank you for your support!

The notification appears instantly if the user is online, or next time they open the app.

---

## Membership Tiers

| Tier   | Price (ETB) | Duration | Features |
|--------|-------------|----------|----------|
| Free   | 0           | Forever  | Limited swipes, ads |
| Silver | 200         | 30 days  | Unlimited swipes, no ads |
| Gold   | 500         | 30 days  | Silver + Super Likes + Rewind |
| VIP    | 1000        | 30 days  | Gold + Priority visibility |

---

## Common Issues

### Issue: Query returns 0 rows updated

**Cause**: Phone number doesn't exist in database

**Solution**: 
1. Check if phone number is correct
2. Run this query to find the user:
```sql
SELECT phone, name FROM public.profiles WHERE phone LIKE '%944%';
```

### Issue: User says they didn't receive notification

**Cause**: User might not be online or app not open

**Solution**:
1. Ask user to close and reopen the app
2. Verify notification was created:
```sql
SELECT * FROM public.notifications 
WHERE user_id = (SELECT id FROM public.profiles WHERE phone = '0944000000')
ORDER BY created_at DESC
LIMIT 5;
```

### Issue: Membership expired immediately

**Cause**: Wrong SQL query used

**Solution**: Use the "Upgrade for 30 Days" query above, not the downgrade function

---

## Bulk Upgrades

To upgrade multiple users at once:

```sql
UPDATE public.memberships m
SET 
  tier = 'gold',
  expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
FROM public.profiles p
WHERE p.phone IN ('0944000000', '0911111111', '0922222222')
  AND m.user_id = p.id;
```

---

## Downgrade Expired Users (Automatic)

The system automatically downgrades expired users daily. You can also run it manually:

```sql
SELECT public.downgrade_expired_memberships();
```

---

## Support

If you encounter any issues:
1. Check Supabase logs for errors
2. Verify the phone number format matches exactly
3. Ensure RLS policies are enabled
4. Contact technical support with error details

---

## Quick Reference

### Upgrade User
```sql
UPDATE public.memberships m
SET tier = 'TIER', expires_at = NOW() + INTERVAL '30 days', updated_at = NOW()
FROM public.profiles p
WHERE p.phone = 'PHONE' AND m.user_id = p.id;
```

### Check User Status
```sql
SELECT p.phone, m.tier, m.expires_at 
FROM public.profiles p 
JOIN public.memberships m ON m.user_id = p.id 
WHERE p.phone = 'PHONE';
```

### View Recent Notifications
```sql
SELECT n.title, n.content, n.created_at, p.phone
FROM public.notifications n
JOIN public.profiles p ON p.id = n.user_id
WHERE n.type = 'upgrade'
ORDER BY n.created_at DESC
LIMIT 10;
```
