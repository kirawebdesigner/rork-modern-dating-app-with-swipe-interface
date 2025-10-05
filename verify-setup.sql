-- ============================================
-- ZEWIJUNA SETUP VERIFICATION
-- Run this after running database-fixes.sql
-- ============================================

-- 1. Check if notifications table exists
SELECT 
  'notifications table' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- 2. Check if RLS is enabled on notifications
SELECT 
  'notifications RLS' as check_name,
  CASE WHEN (
    SELECT relrowsecurity FROM pg_class 
    WHERE relname = 'notifications' AND relnamespace = 'public'::regnamespace
  ) THEN '✅ ENABLED' ELSE '❌ DISABLED' END as status;

-- 3. Check if upgrade trigger exists
SELECT 
  'upgrade trigger' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_membership_upgrade_notify'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- 4. Check if match trigger exists
SELECT 
  'match trigger' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_match_notify'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- 5. Check if upgrade notification function exists
SELECT 
  'notify_membership_upgrade function' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'notify_membership_upgrade'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- 6. Check if match notification function exists
SELECT 
  'notify_new_match function' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'notify_new_match'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- 7. Check if realtime is enabled for notifications
SELECT 
  'notifications realtime' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN '✅ ENABLED' ELSE '❌ DISABLED' END as status;

-- 8. Count existing profiles
SELECT 
  'total profiles' as check_name,
  COUNT(*)::text || ' profiles' as status
FROM public.profiles;

-- 9. Count completed profiles
SELECT 
  'completed profiles' as check_name,
  COUNT(*)::text || ' completed' as status
FROM public.profiles
WHERE completed = true;

-- 10. Count active memberships
SELECT 
  'active memberships' as check_name,
  COUNT(*)::text || ' active' as status
FROM public.memberships
WHERE tier != 'free' AND expires_at > NOW();

-- ============================================
-- EXPECTED RESULTS:
-- All checks should show ✅
-- If any show ❌, re-run database-fixes.sql
-- ============================================

-- ============================================
-- BONUS: View all functions with search_path
-- ============================================
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proconfig as config
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'update_updated_at_column',
    'check_for_match',
    'handle_new_profile',
    'downgrade_expired_memberships',
    'notify_membership_upgrade',
    'notify_new_match'
  )
ORDER BY proname;

-- All functions should have config showing: {search_path=public}
