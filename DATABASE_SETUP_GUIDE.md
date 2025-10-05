# 📚 Database Setup & Admin Guide

## ✅ What Was Fixed

### 1. **SQL Syntax Error (Line 218)**
- **Problem**: Function delimiter was `$` instead of `$$`
- **Fixed**: Changed to proper PostgreSQL function syntax with `$$` delimiters

### 2. **Search Path Security Warnings**
- **Problem**: Functions had mutable search_path (security risk)
- **Fixed**: Added `SET search_path = public` to all functions:
  - `update_updated_at_column()`
  - `check_for_match()`
  - `handle_new_profile()`
  - `downgrade_expired_memberships()`

### 3. **Auto-Membership Creation**
- **Added**: New trigger `on_profile_create_membership` that automatically creates a membership record when a profile is created
- **Benefit**: No more missing membership records

### 4. **Phone Number Sync**
- **Fixed**: Membership table now stores `phone_number` from profile automatically

---

## 🚀 How to Run the SQL Schema

### Step 1: Go to Supabase Dashboard
1. Open your browser and go to: https://supabase.com/dashboard
2. Select your project: **Zewijuna**
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run the Main Schema
1. Click **"+ New Query"** button
2. Copy the entire contents of `database-schema.sql`
3. Paste it into the SQL editor
4. Click **"Run"** button (or press Ctrl+Enter)
5. Wait for success message: ✅ "Success. No rows returned"

### Step 3: Verify Tables Were Created
1. Click on **"Table Editor"** in the left sidebar
2. You should see these tables:
   - ✅ profiles
   - ✅ memberships
   - ✅ swipes
   - ✅ matches
   - ✅ messages
   - ✅ conversations
   - ✅ conversation_participants
   - ✅ profile_views
   - ✅ interests
   - ✅ user_interests
   - ✅ referrals
   - ✅ credit_transactions

---

## 👨‍💼 How to Manually Upgrade Users (Admin)

### Scenario: User Pays via Telebirr → You Verify → Upgrade in Supabase

### Step 1: User Sends Payment Screenshot on Telegram
- User pays to your Telebirr number
- User sends screenshot to your Telegram
- You verify the payment amount and phone number

### Step 2: Find the User in Supabase
1. Go to **SQL Editor** in Supabase
2. Run this query (replace `PHONE_NUMBER` with actual number):

```sql
SELECT 
  p.id,
  p.phone,
  p.name,
  m.tier,
  m.expires_at
FROM public.profiles p
LEFT JOIN public.memberships m ON m.user_id = p.id
WHERE p.phone = '+251912345678';
```

### Step 3: Upgrade the User
Choose the appropriate query from `ADMIN_UPGRADE_QUERIES.sql`:

#### For Silver Plan (30 days):
```sql
UPDATE public.memberships m
SET 
  tier = 'silver',
  expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
FROM public.profiles p
WHERE p.phone = '+251912345678' 
  AND m.user_id = p.id;
```

#### For Gold Plan (30 days):
```sql
UPDATE public.memberships m
SET 
  tier = 'gold',
  expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
FROM public.profiles p
WHERE p.phone = '+251912345678' 
  AND m.user_id = p.id;
```

#### For VIP Plan (30 days):
```sql
UPDATE public.memberships m
SET 
  tier = 'vip',
  expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
FROM public.profiles p
WHERE p.phone = '+251912345678' 
  AND m.user_id = p.id;
```

### Step 4: Verify the Upgrade
Run this query to confirm:
```sql
SELECT 
  p.phone,
  p.name,
  m.tier,
  m.expires_at
FROM public.profiles p
JOIN public.memberships m ON m.user_id = p.id
WHERE p.phone = '+251912345678';
```

You should see the updated tier and expiration date.

---

## 🔄 Automatic Downgrade System

The database includes an automatic downgrade function that resets expired memberships to "free".

### How It Works:
- Function: `downgrade_expired_memberships()`
- Checks all memberships where `expires_at < NOW()`
- Automatically sets them to `tier = 'free'`

### Manual Trigger (if needed):
```sql
SELECT public.downgrade_expired_memberships();
```

### Set Up Automatic Daily Run (Optional):
You can use Supabase Edge Functions or pg_cron to run this daily:
```sql
-- This requires pg_cron extension (ask Supabase support to enable)
SELECT cron.schedule(
  'downgrade-expired-memberships',
  '0 0 * * *', -- Run at midnight every day
  $$SELECT public.downgrade_expired_memberships()$$
);
```

---

## 📊 Useful Admin Queries

### View All Users with Membership Status
```sql
SELECT 
  p.phone,
  p.name,
  m.tier,
  m.expires_at,
  p.created_at
FROM public.profiles p
LEFT JOIN public.memberships m ON m.user_id = p.id
ORDER BY p.created_at DESC;
```

### View Active Premium Members
```sql
SELECT 
  p.phone,
  p.name,
  m.tier,
  m.expires_at,
  EXTRACT(DAY FROM (m.expires_at - NOW())) as days_remaining
FROM public.profiles p
JOIN public.memberships m ON m.user_id = p.id
WHERE m.tier != 'free' 
  AND m.expires_at > NOW()
ORDER BY m.expires_at ASC;
```

### View Expired Memberships
```sql
SELECT 
  p.phone,
  p.name,
  m.tier,
  m.expires_at
FROM public.profiles p
JOIN public.memberships m ON m.user_id = p.id
WHERE m.tier != 'free' 
  AND m.expires_at < NOW();
```

### Recent Signups (Last 7 Days)
```sql
SELECT 
  p.phone,
  p.name,
  p.age,
  m.tier,
  p.created_at
FROM public.profiles p
LEFT JOIN public.memberships m ON m.user_id = p.id
WHERE p.created_at > NOW() - INTERVAL '7 days'
ORDER BY p.created_at DESC;
```

---

## 🔒 Security Notes

### Current RLS Policies
- **Status**: All tables have "Allow All" policies (for development)
- **Warning**: This is NOT secure for production
- **Recommendation**: Implement proper RLS policies before launch

### Recommended RLS Policies (for later):
```sql
-- Example: Users can only update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid());

-- Example: Users can only view their own membership
CREATE POLICY "Users can view own membership" 
ON public.memberships 
FOR SELECT 
USING (user_id = auth.uid());
```

---

## 🐛 Troubleshooting

### Issue: "User not found in memberships table"
**Solution**: The trigger should auto-create memberships. If missing, run:
```sql
INSERT INTO public.memberships (user_id, phone_number, tier)
SELECT id, phone, 'free'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.memberships m WHERE m.user_id = p.id
);
```

### Issue: "Matches not being created"
**Solution**: Check if the trigger is active:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_swipe_check_match';
```

If missing, re-run the `database-schema.sql` file.

### Issue: "Can't see phone numbers in memberships"
**Solution**: Sync phone numbers from profiles:
```sql
UPDATE public.memberships m
SET phone_number = p.phone
FROM public.profiles p
WHERE m.user_id = p.id AND m.phone_number IS NULL;
```

---

## 📞 Support

If you encounter any issues:
1. Check the Supabase logs (Dashboard → Logs)
2. Verify all tables exist (Table Editor)
3. Confirm triggers are active (SQL Editor → `SELECT * FROM pg_trigger`)
4. Review the error message carefully

---

## ✅ Checklist

- [ ] Run `database-schema.sql` in Supabase SQL Editor
- [ ] Verify all 12 tables were created
- [ ] Test user signup in the app
- [ ] Verify membership auto-creation works
- [ ] Test manual upgrade query with a test user
- [ ] Bookmark `ADMIN_UPGRADE_QUERIES.sql` for daily use
- [ ] Set up automatic downgrade (optional)
- [ ] Plan to implement proper RLS policies before launch

---

**Last Updated**: 2025-10-05  
**Database Version**: v2.0 (Phone-based auth with manual payment verification)
