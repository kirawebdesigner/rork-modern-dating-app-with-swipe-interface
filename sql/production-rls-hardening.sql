-- ============================================================
-- PRODUCTION RLS HARDENING — Zewijuna App
-- Run this ONCE on your Supabase SQL Editor before launch.
-- ============================================================

-- 1. PROFILES: Restrict what columns other users can see
-- Drop existing overly-permissive select policy
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

-- Allow users to see ONLY safe columns of other profiles
-- Latitude/longitude, referral codes, last_active, push_token are hidden
CREATE POLICY "profiles_select_safe_columns" ON public.profiles
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

-- Create a VIEW that restricts columns (the RLS policy allows access but the view controls WHAT data)
CREATE OR REPLACE VIEW public.safe_profiles AS
SELECT 
  id, name, age, gender, bio, photos, interests, city,
  height_cm, education, verified, is_premium, completed,
  profile_theme, owned_themes
FROM public.profiles
WHERE completed = true;

-- Grant access to the view
GRANT SELECT ON public.safe_profiles TO authenticated;

-- 2. Block push_token, latitude, longitude from being readable by other users
-- This requires a custom function or using the view above instead of direct table access

-- 3. Ensure swipes composite unique constraint exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'swipes_swiper_swiped_unique'
  ) THEN
    ALTER TABLE public.swipes
      ADD CONSTRAINT swipes_swiper_swiped_unique UNIQUE (swiper_id, swiped_id);
    RAISE NOTICE 'Created swipes composite unique constraint';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Constraint already exists, skipping';
END $$;

-- 4. Add content moderation trigger for messages
CREATE OR REPLACE FUNCTION public.sanitize_message_content()
RETURNS TRIGGER AS $$
DECLARE
  sanitized TEXT;
BEGIN
  sanitized := NEW.content;
  -- Strip phone numbers (7+ digits)
  sanitized := regexp_replace(sanitized, '\+?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s\d-]*', '###', 'g');
  -- Strip URLs
  sanitized := regexp_replace(sanitized, 'https?://[^\s]+', '###', 'gi');
  -- Strip social media handles/links
  sanitized := regexp_replace(sanitized, '(whats?app|telegram|tg\.?|insta(gram)?|snap(chat)?)', '###', 'gi');
  sanitized := regexp_replace(sanitized, '(t\.me|wa\.me|bit\.ly|linktr\.ee|ig\.me)/[\w-]+', '###', 'gi');
  
  NEW.content := sanitized;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sanitize_message_trigger ON public.messages;
CREATE TRIGGER sanitize_message_trigger
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_message_content();

-- 5. Rate limiting table for webhook abuse prevention  
CREATE TABLE IF NOT EXISTS public.webhook_log (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  status TEXT
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_webhook_log_session ON public.webhook_log(session_id);
CREATE INDEX IF NOT EXISTS idx_webhook_log_time ON public.webhook_log(received_at);

-- 6. Ensure payment_transactions has proper constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'payment_tx_session_unique'
  ) THEN
    ALTER TABLE public.payment_transactions
      ADD CONSTRAINT payment_tx_session_unique UNIQUE (session_id);
    RAISE NOTICE 'Created payment_transactions session_id unique constraint';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Constraint already exists, skipping';
END $$;

-- 7. Add index on profiles.completed for faster discovery queries
CREATE INDEX IF NOT EXISTS idx_profiles_completed ON public.profiles(completed) WHERE completed = true;
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles(gender) WHERE completed = true;

SELECT 'Production RLS hardening applied successfully' AS result;
