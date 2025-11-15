-- Dating App Database Schema (Email-Based Authentication with Supabase Auth)
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables and start fresh
DROP TABLE IF EXISTS public.credit_transactions CASCADE;
DROP TABLE IF EXISTS public.user_interests CASCADE;
DROP TABLE IF EXISTS public.interests CASCADE;
DROP TABLE IF EXISTS public.profile_views CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.swipes CASCADE;
DROP TABLE IF EXISTS public.referrals CASCADE;
DROP TABLE IF EXISTS public.memberships CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Profiles table (linked to auth.users via id)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  name TEXT NOT NULL,
  age INTEGER,
  birthday DATE,
  gender TEXT CHECK (gender IN ('boy', 'girl')),
  interested_in TEXT CHECK (interested_in IN ('boy', 'girl')),
  bio TEXT DEFAULT '',
  photos TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  city TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  height_cm INTEGER,
  education TEXT,
  instagram TEXT,
  distance_preference INTEGER DEFAULT 50,
  verified BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  profile_theme TEXT,
  owned_themes TEXT[] DEFAULT '{}',
  completed BOOLEAN DEFAULT FALSE,
  visibility TEXT DEFAULT 'everyone' CHECK (visibility IN ('everyone', 'matches', 'nobody')),
  hide_online_status BOOLEAN DEFAULT FALSE,
  incognito BOOLEAN DEFAULT FALSE,
  referral_code TEXT UNIQUE DEFAULT uuid_generate_v4()::text,
  referred_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memberships table
CREATE TABLE public.memberships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT,
  phone_number TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'silver', 'gold', 'vip')),
  message_credits INTEGER DEFAULT 0,
  boost_credits INTEGER DEFAULT 0,
  unlock_credits INTEGER DEFAULT 0,
  compliment_credits INTEGER DEFAULT 0,
  superlike_credits INTEGER DEFAULT 0,
  remaining_daily_messages INTEGER DEFAULT 5,
  remaining_profile_views INTEGER DEFAULT 10,
  remaining_right_swipes INTEGER,
  remaining_compliments INTEGER,
  last_reset DATE DEFAULT CURRENT_DATE,
  expires_at TIMESTAMP WITH TIME ZONE,
  referral_rewards_claimed INTEGER DEFAULT 0,
  monthly_allowances JSONB DEFAULT '{"monthlyBoosts":0,"monthlySuperLikes":0}'::jsonb,
  last_allowance_grant TIMESTAMPTZ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referrals table
CREATE TABLE public.referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Swipes table
CREATE TABLE public.swipes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  swiper_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  swiped_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT CHECK (action IN ('like', 'nope', 'superlike')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(swiper_id, swiped_id)
);

-- Matches table
CREATE TABLE public.matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user1_id, user2_id)
);

-- Conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Conversation participants
CREATE TABLE public.conversation_participants (
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profile views table
CREATE TABLE public.profile_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  viewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  viewed_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(viewer_id, viewed_id)
);

-- Interests table
CREATE TABLE public.interests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User interests junction table
CREATE TABLE public.user_interests (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest_id UUID REFERENCES public.interests(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, interest_id)
);

-- Credits transactions table
CREATE TABLE public.credit_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('messages', 'boosts', 'unlocks', 'compliments')) NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('purchase', 'earned', 'used')) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment transactions table (for ArifPay integration)
CREATE TABLE public.payment_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT UNIQUE NOT NULL,
  amount DECIMAL NOT NULL,
  currency TEXT DEFAULT 'ETB',
  tier TEXT CHECK (tier IN ('silver', 'gold', 'vip')),
  payment_method TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  arifpay_transaction_id TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_profiles_gender ON public.profiles(gender);
CREATE INDEX idx_profiles_age ON public.profiles(age);
CREATE INDEX idx_profiles_city ON public.profiles(city);
CREATE INDEX idx_profiles_last_active ON public.profiles(last_active);
CREATE INDEX idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX idx_profiles_completed ON public.profiles(completed);
CREATE INDEX idx_profiles_interests ON public.profiles USING GIN(interests);
CREATE INDEX idx_swipes_swiper_id ON public.swipes(swiper_id);
CREATE INDEX idx_swipes_swiped_id ON public.swipes(swiped_id);
CREATE INDEX idx_matches_user1_id ON public.matches(user1_id);
CREATE INDEX idx_matches_user2_id ON public.matches(user2_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_profile_views_viewer_id ON public.profile_views(viewer_id);
CREATE INDEX idx_profile_views_viewed_id ON public.profile_views(viewed_id);
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_session_id ON public.payment_transactions(session_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow all for now - you can restrict later)
CREATE POLICY "Allow all on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on memberships" ON public.memberships FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on referrals" ON public.referrals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on swipes" ON public.swipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on matches" ON public.matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on conversations" ON public.conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on conversation_participants" ON public.conversation_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on profile_views" ON public.profile_views FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on user_interests" ON public.user_interests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on credit_transactions" ON public.credit_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on interests" ON public.interests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on payment_transactions" ON public.payment_transactions FOR ALL USING (true) WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create matches when both users like each other
CREATE OR REPLACE FUNCTION public.check_for_match()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.action IN ('like', 'superlike') THEN
    IF EXISTS (
      SELECT 1 FROM public.swipes
      WHERE swiper_id = NEW.swiped_id
        AND swiped_id = NEW.swiper_id
        AND action IN ('like', 'superlike')
    ) THEN
      INSERT INTO public.matches (user1_id, user2_id)
      VALUES (
        LEAST(NEW.swiper_id, NEW.swiped_id),
        GREATEST(NEW.swiper_id, NEW.swiped_id)
      )
      ON CONFLICT (user1_id, user2_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to check for matches after swipe
CREATE TRIGGER on_swipe_check_match
  AFTER INSERT ON public.swipes
  FOR EACH ROW EXECUTE FUNCTION public.check_for_match();

-- Function to auto-create profile and membership when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  
  -- Create membership
  INSERT INTO public.memberships (user_id, email, tier)
  VALUES (NEW.id, NEW.email, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile and membership on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to downgrade expired memberships
CREATE OR REPLACE FUNCTION public.downgrade_expired_memberships()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.memberships
  SET tier = 'free', expires_at = NULL, updated_at = NOW()
  WHERE tier != 'free' AND expires_at < NOW();
END;
$$;

-- Insert default interests
INSERT INTO public.interests (name, category) VALUES
  ('Travel', 'Lifestyle'),
  ('Photography', 'Creative'),
  ('Music', 'Creative'),
  ('Fitness', 'Health'),
  ('Cooking', 'Lifestyle'),
  ('Reading', 'Intellectual'),
  ('Movies', 'Entertainment'),
  ('Gaming', 'Entertainment'),
  ('Art', 'Creative'),
  ('Dancing', 'Creative'),
  ('Hiking', 'Outdoor'),
  ('Swimming', 'Sports'),
  ('Yoga', 'Health'),
  ('Coffee', 'Lifestyle'),
  ('Wine', 'Lifestyle'),
  ('Technology', 'Intellectual'),
  ('Fashion', 'Lifestyle'),
  ('Pets', 'Lifestyle'),
  ('Sports', 'Sports'),
  ('Nature', 'Outdoor')
ON CONFLICT (name) DO NOTHING;
