-- ============================================================
-- ZEWIJUNA ADMIN ANALYTICS v2 — CLEAN FIX
-- Paste this ENTIRE script into Supabase SQL Editor and RUN.
-- This fixes the SECURITY DEFINER view warnings.
-- ============================================================

-- ============================================================
-- STEP 1: DROP ALL OLD VIEWS (removes security definer issues)
-- ============================================================
DROP VIEW IF EXISTS public.admin_analytics CASCADE;
DROP VIEW IF EXISTS public.admin_daily_signups CASCADE;
DROP VIEW IF EXISTS public.admin_revenue_by_tier CASCADE;
DROP VIEW IF EXISTS public.admin_daily_revenue CASCADE;
DROP VIEW IF EXISTS public.admin_top_cities CASCADE;
DROP VIEW IF EXISTS public.admin_recent_signups CASCADE;
DROP VIEW IF EXISTS public.admin_monthly_signups CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_dashboard() CASCADE;


-- ============================================================
-- STEP 2: RECREATE VIEWS (plain views, NO security definer)
-- These use SECURITY INVOKER (default) = safe, no lint errors
-- ============================================================

-- 1. Analytics Summary
CREATE VIEW public.admin_analytics WITH (security_invoker = true) AS
SELECT
  (SELECT COUNT(*) FROM public.profiles) AS total_users,
  (SELECT COUNT(*) FROM public.profiles WHERE completed = TRUE) AS completed_profiles,
  (SELECT COUNT(*) FROM public.profiles WHERE completed = FALSE OR completed IS NULL) AS incomplete_profiles,
  (SELECT COUNT(*) FROM public.profiles WHERE verified = TRUE) AS verified_users,
  (SELECT COUNT(*) FROM public.profiles WHERE gender = 'boy') AS male_users,
  (SELECT COUNT(*) FROM public.profiles WHERE gender = 'girl') AS female_users,
  (SELECT COUNT(*) FROM public.memberships WHERE tier = 'free') AS free_users,
  (SELECT COUNT(*) FROM public.memberships WHERE tier = 'silver') AS silver_users,
  (SELECT COUNT(*) FROM public.memberships WHERE tier = 'gold') AS gold_users,
  (SELECT COUNT(*) FROM public.memberships WHERE tier = 'vip') AS vip_users,
  (SELECT COUNT(*) FROM public.memberships WHERE tier != 'free') AS total_paid_users,
  (SELECT COUNT(*) FROM public.swipes) AS total_swipes,
  (SELECT COUNT(*) FROM public.matches) AS total_matches,
  (SELECT COUNT(*) FROM public.conversations) AS total_conversations,
  (SELECT COUNT(*) FROM public.messages) AS total_messages,
  (SELECT COALESCE(SUM(amount), 0) FROM public.payment_transactions WHERE status = 'completed') AS total_revenue,
  (SELECT COUNT(*) FROM public.referrals) AS total_referrals,
  (SELECT COUNT(*) FROM public.profiles WHERE created_at >= CURRENT_DATE) AS signups_today,
  (SELECT COUNT(*) FROM public.profiles WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)) AS signups_this_week,
  (SELECT COUNT(*) FROM public.profiles WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) AS signups_this_month,
  (SELECT COUNT(*) FROM public.profiles WHERE last_active >= NOW() - INTERVAL '24 hours') AS active_last_24h;


-- 2. Daily Signups (last 30 days)
CREATE VIEW public.admin_daily_signups WITH (security_invoker = true) AS
SELECT 
  DATE(created_at) AS signup_date,
  COUNT(*) AS signups
FROM public.profiles
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY signup_date DESC;


-- 3. Revenue by Tier
CREATE VIEW public.admin_revenue_by_tier WITH (security_invoker = true) AS
SELECT 
  tier,
  COUNT(*) AS transactions,
  COALESCE(SUM(amount), 0) AS total_amount
FROM public.payment_transactions
WHERE status = 'completed'
GROUP BY tier
ORDER BY total_amount DESC;


-- 4. Daily Revenue (last 30 days)
CREATE VIEW public.admin_daily_revenue WITH (security_invoker = true) AS
SELECT 
  DATE(completed_at) AS revenue_date,
  COUNT(*) AS transactions,
  COALESCE(SUM(amount), 0) AS total_amount
FROM public.payment_transactions
WHERE status = 'completed'
  AND completed_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(completed_at)
ORDER BY revenue_date DESC;


-- 5. Top Cities
CREATE VIEW public.admin_top_cities WITH (security_invoker = true) AS
SELECT 
  COALESCE(city, 'Unknown') AS city,
  COUNT(*) AS user_count
FROM public.profiles
GROUP BY city
ORDER BY user_count DESC
LIMIT 20;


-- 6. All Users (NO LIMIT — dashboard handles pagination)
CREATE VIEW public.admin_recent_signups WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.name,
  p.email,
  p.phone,
  p.gender,
  p.age,
  p.city,
  p.bio,
  p.completed,
  p.verified,
  p.is_premium,
  p.interests,
  p.instagram,
  p.education,
  p.height_cm,
  p.last_active,
  p.referral_code,
  m.tier AS membership_tier,
  m.expires_at AS membership_expires,
  p.created_at
FROM public.profiles p
LEFT JOIN public.memberships m ON m.user_id = p.id
ORDER BY p.created_at DESC;


-- 7. Monthly Signups
CREATE VIEW public.admin_monthly_signups WITH (security_invoker = true) AS
SELECT 
  TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
  COUNT(*) AS signups
FROM public.profiles
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC
LIMIT 12;


-- ============================================================
-- STEP 3: RPC function (this one NEEDS security definer for RPC)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_admin_dashboard()
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'free_users', (SELECT COUNT(*) FROM memberships WHERE tier = 'free'),
    'silver_users', (SELECT COUNT(*) FROM memberships WHERE tier = 'silver'),
    'gold_users', (SELECT COUNT(*) FROM memberships WHERE tier = 'gold'),
    'vip_users', (SELECT COUNT(*) FROM memberships WHERE tier = 'vip'),
    'total_paid_users', (SELECT COUNT(*) FROM memberships WHERE tier != 'free'),
    'total_revenue', (SELECT COALESCE(SUM(amount), 0) FROM payment_transactions WHERE status = 'completed'),
    'total_matches', (SELECT COUNT(*) FROM matches),
    'total_messages', (SELECT COUNT(*) FROM messages),
    'signups_today', (SELECT COUNT(*) FROM profiles WHERE created_at >= CURRENT_DATE)
  ) INTO result;
  RETURN result;
END;
$$;


-- ============================================================
-- DONE! Quick test:
--   SELECT * FROM public.admin_analytics;
-- ============================================================
