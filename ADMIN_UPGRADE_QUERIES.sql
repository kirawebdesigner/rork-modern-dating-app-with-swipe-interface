-- ========================================
-- ADMIN MANUAL UPGRADE QUERIES
-- ========================================
-- Use these queries in Supabase SQL Editor to manually upgrade users
-- after verifying Telebirr payment on Telegram

-- ========================================
-- 1. VIEW ALL USERS WITH MEMBERSHIP INFO
-- ========================================
SELECT 
  p.id,
  p.phone,
  p.name,
  m.tier,
  m.expires_at,
  m.created_at as member_since
FROM public.profiles p
LEFT JOIN public.memberships m ON m.user_id = p.id
ORDER BY p.created_at DESC;

-- ========================================
-- 2. UPGRADE USER TO SILVER (30 days)
-- ========================================
-- Replace 'USER_PHONE_HERE' with actual phone number
UPDATE public.memberships m
SET 
  tier = 'silver',
  expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
FROM public.profiles p
WHERE p.phone = 'USER_PHONE_HERE' 
  AND m.user_id = p.id;

-- ========================================
-- 3. UPGRADE USER TO GOLD (30 days)
-- ========================================
-- Replace 'USER_PHONE_HERE' with actual phone number
UPDATE public.memberships m
SET 
  tier = 'gold',
  expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
FROM public.profiles p
WHERE p.phone = 'USER_PHONE_HERE' 
  AND m.user_id = p.id;

-- ========================================
-- 4. UPGRADE USER TO VIP (30 days)
-- ========================================
-- Replace 'USER_PHONE_HERE' with actual phone number
UPDATE public.memberships m
SET 
  tier = 'vip',
  expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
FROM public.profiles p
WHERE p.phone = 'USER_PHONE_HERE' 
  AND m.user_id = p.id;

-- ========================================
-- 5. EXTEND EXISTING MEMBERSHIP (if already active)
-- ========================================
-- This adds 30 days to current expiration (doesn't reset it)
-- Replace 'USER_PHONE_HERE' with actual phone number
UPDATE public.memberships m
SET 
  tier = 'gold',
  expires_at = GREATEST(COALESCE(expires_at, NOW()), NOW()) + INTERVAL '30 days',
  updated_at = NOW()
FROM public.profiles p
WHERE p.phone = 'USER_PHONE_HERE' 
  AND m.user_id = p.id;

-- ========================================
-- 6. DOWNGRADE USER TO FREE (manual)
-- ========================================
-- Replace 'USER_PHONE_HERE' with actual phone number
UPDATE public.memberships m
SET 
  tier = 'free',
  expires_at = NULL,
  updated_at = NOW()
FROM public.profiles p
WHERE p.phone = 'USER_PHONE_HERE' 
  AND m.user_id = p.id;

-- ========================================
-- 7. CHECK EXPIRED MEMBERSHIPS
-- ========================================
SELECT 
  p.phone,
  p.name,
  m.tier,
  m.expires_at,
  (m.expires_at < NOW()) as is_expired
FROM public.profiles p
JOIN public.memberships m ON m.user_id = p.id
WHERE m.tier != 'free' 
  AND m.expires_at < NOW()
ORDER BY m.expires_at DESC;

-- ========================================
-- 8. MANUALLY RUN DOWNGRADE FOR EXPIRED USERS
-- ========================================
-- This downgrades all expired memberships to free
SELECT public.downgrade_expired_memberships();

-- ========================================
-- 9. SEARCH USER BY PHONE
-- ========================================
-- Replace 'PHONE_NUMBER' with the phone to search
SELECT 
  p.id,
  p.phone,
  p.name,
  p.age,
  p.gender,
  p.city,
  m.tier,
  m.expires_at,
  p.created_at
FROM public.profiles p
LEFT JOIN public.memberships m ON m.user_id = p.id
WHERE p.phone LIKE '%PHONE_NUMBER%';

-- ========================================
-- 10. VIEW RECENT SIGNUPS (Last 7 days)
-- ========================================
SELECT 
  p.phone,
  p.name,
  p.age,
  p.gender,
  m.tier,
  p.created_at
FROM public.profiles p
LEFT JOIN public.memberships m ON m.user_id = p.id
WHERE p.created_at > NOW() - INTERVAL '7 days'
ORDER BY p.created_at DESC;

-- ========================================
-- 11. GRANT BONUS CREDITS TO USER
-- ========================================
-- Replace 'USER_PHONE_HERE' with actual phone number
UPDATE public.memberships m
SET 
  message_credits = message_credits + 50,
  boost_credits = boost_credits + 5,
  superlike_credits = superlike_credits + 10,
  updated_at = NOW()
FROM public.profiles p
WHERE p.phone = 'USER_PHONE_HERE' 
  AND m.user_id = p.id;

-- ========================================
-- 12. VIEW ALL ACTIVE PREMIUM MEMBERS
-- ========================================
SELECT 
  p.phone,
  p.name,
  m.tier,
  m.expires_at,
  EXTRACT(DAY FROM (m.expires_at - NOW())) as days_remaining
FROM public.profiles p
JOIN public.memberships m ON m.user_id = p.id
WHERE m.tier != 'free' 
  AND (m.expires_at IS NULL OR m.expires_at > NOW())
ORDER BY m.expires_at ASC;
