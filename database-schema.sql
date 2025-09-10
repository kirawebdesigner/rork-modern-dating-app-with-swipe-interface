-- Dating App Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER,
  birthday DATE,
  gender TEXT CHECK (gender IN ('boy', 'girl')),
  bio TEXT DEFAULT '',
  photos TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  city TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  height_cm INTEGER,
  education TEXT,
  distance_preference INTEGER DEFAULT 50,
  verified BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  visibility TEXT DEFAULT 'everyone' CHECK (visibility IN ('everyone', 'matches', 'nobody')),
  hide_online_status BOOLEAN DEFAULT FALSE,
  incognito BOOLEAN DEFAULT FALSE,
  referral_code TEXT UNIQUE DEFAULT uuid_generate_v4()::text,
  referred_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memberships table
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'silver', 'gold', 'vip')),
  message_credits INTEGER DEFAULT 0,
  boost_credits INTEGER DEFAULT 0,
  unlock_credits INTEGER DEFAULT 0,
  compliment_credits INTEGER DEFAULT 0,
  remaining_daily_messages INTEGER DEFAULT 5,
  remaining_profile_views INTEGER DEFAULT 10,
  last_reset DATE DEFAULT CURRENT_DATE,
  expires_at TIMESTAMP WITH TIME ZONE,
  referral_rewards_claimed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure memberships has all required columns used by the app
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS superlike_credits INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_right_swipes INTEGER,
  ADD COLUMN IF NOT EXISTS remaining_compliments INTEGER,
  ADD COLUMN IF NOT EXISTS monthly_allowances JSONB DEFAULT '{"monthlyBoosts":0,"monthlySuperLikes":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_allowance_grant TIMESTAMPTZ;

-- Referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Swipes table
CREATE TABLE IF NOT EXISTS public.swipes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  swiper_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  swiped_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT CHECK (action IN ('like', 'nope', 'superlike')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(swiper_id, swiped_id)
);

-- Matches table
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user1_id, user2_id)
);

-- If an old messages table exists (match-based), rename it to match_messages to avoid conflicts
DO $
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'messages'
  ) THEN
    -- Check if it looks like the old structure by presence of match_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'match_id'
    ) THEN
      ALTER TABLE public.messages RENAME TO match_messages;
    END IF;
  END IF;
END $;

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Conversation participants
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);

-- New messages table (conversation-based)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profile views table
CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  viewed_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(viewer_id, viewed_id)
);

-- Interests table (predefined interests)
CREATE TABLE IF NOT EXISTS public.interests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User interests junction table
CREATE TABLE IF NOT EXISTS public.user_interests (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_id UUID REFERENCES public.interests(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, interest_id)
);

-- Credits transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('messages', 'boosts', 'unlocks', 'compliments')) NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('purchase', 'earned', 'used')) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles(gender);
CREATE INDEX IF NOT EXISTS idx_profiles_age ON public.profiles(age);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON public.profiles(last_active);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_swipes_swiper_id ON public.swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped_id ON public.swipes(swiped_id);
CREATE INDEX IF NOT EXISTS idx_matches_user1_id ON public.matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2_id ON public.matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_id ON public.profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_id ON public.profile_views(viewed_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Memberships policies
CREATE POLICY "Users can view own membership" ON public.memberships
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own membership" ON public.memberships
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own membership" ON public.memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Referrals policies
CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE POLICY "Users can insert their referral record" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referred_user_id);

-- Swipes policies
CREATE POLICY "Users can view own swipes" ON public.swipes
  FOR SELECT USING (auth.uid() = swiper_id);

CREATE POLICY "Users can insert own swipes" ON public.swipes
  FOR INSERT WITH CHECK (auth.uid() = swiper_id);

-- Matches policies
CREATE POLICY "Users can view own matches" ON public.matches
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "System can insert matches" ON public.matches
  FOR INSERT WITH CHECK (true);

-- Conversation-based messages policies
CREATE POLICY "Participants can select messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can insert messages" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- Conversations policies
CREATE POLICY "Participants can select conversations" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Conversation participants policies
CREATE POLICY "Users can manage own participation" ON public.conversation_participants
  FOR ALL USING (user_id = auth.uid());

-- Profile views policies
CREATE POLICY "Users can view own profile views" ON public.profile_views
  FOR SELECT USING (auth.uid() = viewer_id OR auth.uid() = viewed_id);

CREATE POLICY "Users can insert own profile views" ON public.profile_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- User interests policies
CREATE POLICY "Users can view own interests" ON public.user_interests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own interests" ON public.user_interests
  FOR ALL USING (auth.uid() = user_id);

-- Credit transactions policies
CREATE POLICY "Users can view own transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.credit_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Interests are public
CREATE POLICY "Anyone can view interests" ON public.interests
  FOR SELECT USING (true);

-- Functions

-- Function to create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User'));
  
  INSERT INTO public.memberships (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Trigger to automatically create profile and membership on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create matches when both users like each other
CREATE OR REPLACE FUNCTION public.check_for_match()
RETURNS TRIGGER AS $
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
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Trigger to check for matches after swipe
CREATE OR REPLACE TRIGGER on_swipe_check_match
  AFTER INSERT ON public.swipes
  FOR EACH ROW EXECUTE FUNCTION public.check_for_match();

-- Insert some default interests
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