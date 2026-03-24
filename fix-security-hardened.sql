-- ============================================================================
-- 1. FIX FUNCTION SEARCH PATHS (SECURITY HARDENING)
-- ============================================================================

-- Function: update_updated_at_column
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Function: check_for_match
ALTER FUNCTION public.check_for_match() SET search_path = public;

-- Function: handle_new_user
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Function: downgrade_expired_memberships
ALTER FUNCTION public.downgrade_expired_memberships() SET search_path = public;

-- Function: handle_new_match (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_match') THEN
        ALTER FUNCTION public.handle_new_match() SET search_path = public;
    END IF;
END $$;

-- Function: sync_profile_email (if it exists from your linter warnings)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_profile_email') THEN
        ALTER FUNCTION public.sync_profile_email() SET search_path = public;
    END IF;
END $$;


-- ============================================================================
-- 2. NOTIFICATIONS TABLE SECURITY
-- ============================================================================

-- Create table if it doesn't exist (just in case)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT,
    content TEXT,
    read BOOLEAN DEFAULT FALSE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop permissive policies
DROP POLICY IF EXISTS "Allow all on notifications" ON public.notifications;

-- Secure policies
CREATE POLICY "notifications_select_policy" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_policy" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_update_policy" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_delete_policy" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);


-- ============================================================================
-- 3. PROFILES TABLE AUTO-UPDATE FIX
-- Ensure name is never null and handle_new_user is robust
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'User'))
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    updated_at = NOW();
  
  -- Create membership
  INSERT INTO public.memberships (user_id, email, tier)
  VALUES (NEW.id, NEW.email, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;
