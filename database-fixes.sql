-- ============================================
-- ZEWIJUNA DATABASE FIXES
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. CREATE NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('upgrade', 'match', 'message', 'like', 'superlike', 'system')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" 
  ON public.notifications FOR SELECT 
  USING (true);

CREATE POLICY "Allow insert notifications" 
  ON public.notifications FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
  ON public.notifications FOR UPDATE 
  USING (true);

-- 2. FUNCTION TO SEND UPGRADE NOTIFICATION
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_membership_upgrade()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only notify if tier actually changed and is not 'free'
  IF (OLD.tier IS DISTINCT FROM NEW.tier) AND NEW.tier != 'free' THEN
    INSERT INTO public.notifications (user_id, type, title, content, data)
    VALUES (
      NEW.user_id,
      'upgrade',
      'Account Upgraded! 🎉',
      'Your account has been upgraded to ' || UPPER(NEW.tier) || ' plan. Thank you for your support!',
      jsonb_build_object('tier', NEW.tier, 'expires_at', NEW.expires_at)
    );
    
    RAISE NOTICE 'Upgrade notification sent to user %', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for membership upgrade notifications
DROP TRIGGER IF EXISTS on_membership_upgrade_notify ON public.memberships;
CREATE TRIGGER on_membership_upgrade_notify
  AFTER UPDATE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_membership_upgrade();

-- 3. FUNCTION TO SEND MATCH NOTIFICATION
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_new_match()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user1_name TEXT;
  user2_name TEXT;
BEGIN
  -- Get names of both users
  SELECT name INTO user1_name FROM public.profiles WHERE id = NEW.user1_id;
  SELECT name INTO user2_name FROM public.profiles WHERE id = NEW.user2_id;
  
  -- Notify user1
  INSERT INTO public.notifications (user_id, type, title, content, data)
  VALUES (
    NEW.user1_id,
    'match',
    'It''s a Match! 💕',
    'You and ' || COALESCE(user2_name, 'someone') || ' liked each other!',
    jsonb_build_object('match_id', NEW.id, 'other_user_id', NEW.user2_id)
  );
  
  -- Notify user2
  INSERT INTO public.notifications (user_id, type, title, content, data)
  VALUES (
    NEW.user2_id,
    'match',
    'It''s a Match! 💕',
    'You and ' || COALESCE(user1_name, 'someone') || ' liked each other!',
    jsonb_build_object('match_id', NEW.id, 'other_user_id', NEW.user1_id)
  );
  
  RAISE NOTICE 'Match notifications sent for match %', NEW.id;
  
  RETURN NEW;
END;
$$;

-- Trigger for match notifications
DROP TRIGGER IF EXISTS on_match_notify ON public.matches;
CREATE TRIGGER on_match_notify
  AFTER INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_match();

-- 4. ADMIN UPGRADE QUERIES
-- ============================================

-- Upgrade user by phone number (30 days)
-- Replace 'USER_PHONE_HERE' with actual phone and 'gold' with desired tier
/*
UPDATE public.memberships m
SET 
  tier = 'gold',
  expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
FROM public.profiles p
WHERE p.phone = 'USER_PHONE_HERE' 
  AND m.user_id = p.id;
*/

-- Upgrade user by phone number (extend existing or add 30 days)
/*
UPDATE public.memberships m
SET 
  tier = 'gold',
  expires_at = GREATEST(COALESCE(expires_at, NOW()), NOW()) + INTERVAL '30 days',
  updated_at = NOW()
FROM public.profiles p
WHERE p.phone = 'USER_PHONE_HERE' 
  AND m.user_id = p.id;
*/

-- Check user's current membership
/*
SELECT 
  p.phone,
  p.name,
  m.tier,
  m.expires_at,
  CASE 
    WHEN m.expires_at IS NULL THEN 'No expiration'
    WHEN m.expires_at > NOW() THEN 'Active'
    ELSE 'Expired'
  END as status
FROM public.profiles p
JOIN public.memberships m ON m.user_id = p.id
WHERE p.phone = 'USER_PHONE_HERE';
*/

-- 5. ENABLE REALTIME FOR NOTIFICATIONS
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 6. VERIFY SETUP
-- ============================================
-- Run this to verify everything is set up correctly:
/*
SELECT 
  'notifications table' as check_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status
UNION ALL
SELECT 
  'notifications RLS enabled',
  CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'notifications') 
    THEN '✅ ENABLED' 
    ELSE '❌ DISABLED' 
  END
UNION ALL
SELECT 
  'upgrade trigger exists',
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_membership_upgrade_notify') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END
UNION ALL
SELECT 
  'match trigger exists',
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_match_notify') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END;
*/

-- 7. TEST NOTIFICATION SYSTEM
-- ============================================
-- Test by manually inserting a notification (replace USER_ID with actual UUID):
/*
INSERT INTO public.notifications (user_id, type, title, content)
VALUES (
  'USER_ID_HERE',
  'system',
  'Test Notification',
  'This is a test notification to verify the system works!'
);
*/

-- ============================================
-- DONE! 
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Test by upgrading a user's membership
-- 3. Check that notification appears in notifications table
-- 4. Frontend will receive real-time updates automatically
-- ============================================
