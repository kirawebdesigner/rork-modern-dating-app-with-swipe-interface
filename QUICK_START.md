# 🚀 Zewijuna - Quick Start Guide

## 1️⃣ Setup Database (5 minutes)

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy all content from `database-fixes.sql`
4. Click **Run**
5. ✅ Done!

---

## 2️⃣ Verify Setup

Run this in SQL Editor:

```sql
SELECT 
  'notifications table' as check_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status
UNION ALL
SELECT 
  'upgrade trigger',
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_membership_upgrade_notify') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END
UNION ALL
SELECT 
  'match trigger',
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_match_notify') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END;
```

Expected: All show ✅ EXISTS

---

## 3️⃣ Test the App

### Create Test Accounts

**Account 1 (Girl)**:
- Phone: 0944000000
- Name: Sara
- Gender: Girl
- Interested in: Boy
- Complete profile (add photo, bio, interests)

**Account 2 (Boy)**:
- Phone: 0911111111
- Name: John
- Gender: Boy
- Interested in: Girl
- Complete profile

### Test Discover
1. Login as Sara → Should see John
2. Login as John → Should see Sara

### Test Matching
1. Sara likes John
2. John likes Sara
3. Both receive "It's a Match! 💕" notification

### Test Chat
1. Open match
2. Send message
3. Other user receives instantly

---

## 4️⃣ Upgrade a User (Admin)

When user sends Telebirr payment:

```sql
-- Replace phone and tier
UPDATE public.memberships m
SET 
  tier = 'gold',
  expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
FROM public.profiles p
WHERE p.phone = '0944000000' 
  AND m.user_id = p.id;
```

User receives notification instantly! 🎉

---

## 5️⃣ Check User Status

```sql
SELECT 
  p.phone,
  p.name,
  m.tier,
  m.expires_at,
  CASE 
    WHEN m.expires_at > NOW() THEN 'Active ✅'
    ELSE 'Expired ❌'
  END as status
FROM public.profiles p
JOIN public.memberships m ON m.user_id = p.id
WHERE p.phone = '0944000000';
```

---

## 🆘 Quick Fixes

### User Not Seeing Profiles?

```sql
-- Make profile completed
UPDATE profiles 
SET completed = true 
WHERE phone = '0944000000';
```

### Notification Not Working?

```sql
-- Check if created
SELECT * FROM notifications 
WHERE user_id = (SELECT id FROM profiles WHERE phone = '0944000000')
ORDER BY created_at DESC;
```

### Match Not Created?

```sql
-- Check swipes
SELECT * FROM swipes 
WHERE swiper_id = (SELECT id FROM profiles WHERE phone = '0944000000')
   OR swiped_id = (SELECT id FROM profiles WHERE phone = '0944000000');
```

---

## 📱 Membership Tiers

| Tier   | Price | Features |
|--------|-------|----------|
| Free   | 0 ETB | Limited swipes |
| Silver | 200 ETB | Unlimited swipes |
| Gold   | 500 ETB | + Super Likes + Rewind |
| VIP    | 1000 ETB | + Priority visibility |

---

## 📚 Full Documentation

- **ADMIN_UPGRADE_GUIDE.md** - Complete admin guide
- **FIXES_COMPLETE_SUMMARY.md** - All fixes explained
- **database-fixes.sql** - SQL setup file

---

## ✅ What's Fixed

✅ Login/Logout session management  
✅ Discover page shows users  
✅ Real-time chat  
✅ Upgrade notifications  
✅ Match notifications  
✅ Admin upgrade system  

---

## 🎯 Common Admin Tasks

### Upgrade User
```sql
UPDATE memberships m SET tier = 'gold', expires_at = NOW() + INTERVAL '30 days'
FROM profiles p WHERE p.phone = 'PHONE' AND m.user_id = p.id;
```

### Check All Active Memberships
```sql
SELECT p.phone, m.tier, m.expires_at 
FROM profiles p JOIN memberships m ON m.user_id = p.id 
WHERE m.tier != 'free' AND m.expires_at > NOW();
```

### View Recent Notifications
```sql
SELECT p.phone, n.title, n.created_at 
FROM notifications n JOIN profiles p ON p.id = n.user_id 
ORDER BY n.created_at DESC LIMIT 10;
```

---

**Ready to go! 🚀**

Need help? Check the full documentation files.
