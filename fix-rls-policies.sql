-- ============================================================================
-- Fix #2: Secure Row-Level Security (RLS) Policies
-- Replaces "Allow all" with proper user-scoped policies
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE
-- Users can read all completed profiles (for discovery) but only edit their own
-- ============================================================================
DROP POLICY IF EXISTS "Allow all on profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "profiles_delete_policy" ON profiles
  FOR DELETE USING (auth.uid()::text = id::text);


-- ============================================================================
-- 2. MEMBERSHIPS TABLE
-- Users can only see/modify their own membership
-- ============================================================================
DROP POLICY IF EXISTS "Allow all on memberships" ON memberships;
DROP POLICY IF EXISTS "memberships_select_policy" ON memberships;
DROP POLICY IF EXISTS "memberships_insert_policy" ON memberships;
DROP POLICY IF EXISTS "memberships_update_policy" ON memberships;

CREATE POLICY "memberships_select_policy" ON memberships
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "memberships_insert_policy" ON memberships
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "memberships_update_policy" ON memberships
  FOR UPDATE USING (auth.uid()::text = user_id::text);


-- ============================================================================
-- 3. SWIPES TABLE
-- Users can only see/create their own swipes
-- ============================================================================
DROP POLICY IF EXISTS "Allow all on swipes" ON swipes;
DROP POLICY IF EXISTS "swipes_select_policy" ON swipes;
DROP POLICY IF EXISTS "swipes_insert_policy" ON swipes;
DROP POLICY IF EXISTS "swipes_delete_policy" ON swipes;

CREATE POLICY "swipes_select_policy" ON swipes
  FOR SELECT USING (auth.uid()::text = swiper_id::text);

CREATE POLICY "swipes_insert_policy" ON swipes
  FOR INSERT WITH CHECK (auth.uid()::text = swiper_id::text);

CREATE POLICY "swipes_delete_policy" ON swipes
  FOR DELETE USING (auth.uid()::text = swiper_id::text);


-- ============================================================================
-- 4. MATCHES TABLE
-- Users can only see their own matches
-- ============================================================================
DROP POLICY IF EXISTS "Allow all on matches" ON matches;
DROP POLICY IF EXISTS "matches_select_policy" ON matches;
DROP POLICY IF EXISTS "matches_insert_policy" ON matches;
DROP POLICY IF EXISTS "matches_delete_policy" ON matches;

CREATE POLICY "matches_select_policy" ON matches
  FOR SELECT USING (auth.uid()::text = user1_id::text OR auth.uid()::text = user2_id::text);

CREATE POLICY "matches_insert_policy" ON matches
  FOR INSERT WITH CHECK (auth.uid()::text = user1_id::text OR auth.uid()::text = user2_id::text);

CREATE POLICY "matches_delete_policy" ON matches
  FOR DELETE USING (auth.uid()::text = user1_id::text OR auth.uid()::text = user2_id::text);


-- ============================================================================
-- 5. CONVERSATIONS TABLE
-- Users can see conversations they participate in
-- ============================================================================
DROP POLICY IF EXISTS "Allow all on conversations" ON conversations;
DROP POLICY IF EXISTS "conversations_select_policy" ON conversations;
DROP POLICY IF EXISTS "conversations_insert_policy" ON conversations;

CREATE POLICY "conversations_select_policy" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "conversations_insert_policy" ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- ============================================================================
-- 6. CONVERSATION PARTICIPANTS TABLE
-- Users can read participants (non-recursive to prevent infinite loops)
-- ============================================================================
DROP POLICY IF EXISTS "Allow all on conversation_participants" ON conversation_participants;
DROP POLICY IF EXISTS "cp_select_policy" ON conversation_participants;
DROP POLICY IF EXISTS "cp_insert_policy" ON conversation_participants;

CREATE POLICY "cp_select_policy" ON conversation_participants
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "cp_insert_policy" ON conversation_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- ============================================================================
-- 7. MESSAGES TABLE
-- Schema: id, conversation_id, sender_id, content, created_at
-- Users can see messages in conversations they belong to
-- ============================================================================
DROP POLICY IF EXISTS "Allow all on messages" ON messages;
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
DROP POLICY IF EXISTS "messages_update_policy" ON messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON messages;

CREATE POLICY "messages_select_policy" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "messages_insert_policy" ON messages
  FOR INSERT WITH CHECK (auth.uid()::text = sender_id::text);

CREATE POLICY "messages_update_policy" ON messages
  FOR UPDATE USING (auth.uid()::text = sender_id::text);

CREATE POLICY "messages_delete_policy" ON messages
  FOR DELETE USING (auth.uid()::text = sender_id::text);


-- ============================================================================
-- 8. PROFILE VIEWS TABLE
-- Users can see who viewed them and create their own views
-- ============================================================================
DROP POLICY IF EXISTS "Allow all on profile_views" ON profile_views;
DROP POLICY IF EXISTS "profile_views_select_policy" ON profile_views;
DROP POLICY IF EXISTS "profile_views_insert_policy" ON profile_views;

CREATE POLICY "profile_views_select_policy" ON profile_views
  FOR SELECT USING (
    auth.uid()::text = viewer_id::text OR auth.uid()::text = viewed_id::text
  );

CREATE POLICY "profile_views_insert_policy" ON profile_views
  FOR INSERT WITH CHECK (auth.uid()::text = viewer_id::text);


-- ============================================================================
-- 9. PAYMENT_TRANSACTIONS TABLE
-- Users can only see their own transactions
-- ============================================================================
DROP POLICY IF EXISTS "Allow all on payment_transactions" ON payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_select_policy" ON payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_insert_policy" ON payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_update_policy" ON payment_transactions;

CREATE POLICY "payment_transactions_select_policy" ON payment_transactions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "payment_transactions_insert_policy" ON payment_transactions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "payment_transactions_update_policy" ON payment_transactions
  FOR UPDATE USING (auth.uid()::text = user_id::text);


-- ============================================================================
-- 10. CREDIT TRANSACTIONS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Allow all on credit_transactions" ON credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_select_policy" ON credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_insert_policy" ON credit_transactions;

CREATE POLICY "credit_transactions_select_policy" ON credit_transactions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "credit_transactions_insert_policy" ON credit_transactions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);


-- ============================================================================
-- 11. REFERRALS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Allow all on referrals" ON referrals;
DROP POLICY IF EXISTS "referrals_select_policy" ON referrals;
DROP POLICY IF EXISTS "referrals_insert_policy" ON referrals;

CREATE POLICY "referrals_select_policy" ON referrals
  FOR SELECT USING (
    auth.uid()::text = referrer_id::text OR auth.uid()::text = referred_user_id::text
  );

CREATE POLICY "referrals_insert_policy" ON referrals
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- ============================================================================
-- 12. INTERESTS TABLE (read-only for users)
-- ============================================================================
DROP POLICY IF EXISTS "Allow all on interests" ON interests;
DROP POLICY IF EXISTS "interests_select_policy" ON interests;

CREATE POLICY "interests_select_policy" ON interests
  FOR SELECT USING (auth.uid() IS NOT NULL);


-- ============================================================================
-- 13. USER INTERESTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Allow all on user_interests" ON user_interests;
DROP POLICY IF EXISTS "user_interests_select_policy" ON user_interests;
DROP POLICY IF EXISTS "user_interests_insert_policy" ON user_interests;
DROP POLICY IF EXISTS "user_interests_delete_policy" ON user_interests;

CREATE POLICY "user_interests_select_policy" ON user_interests
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "user_interests_insert_policy" ON user_interests
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "user_interests_delete_policy" ON user_interests
  FOR DELETE USING (auth.uid()::text = user_id::text);


-- ============================================================================
-- 14. APP VERSIONS TABLE (read-only for all authenticated users)
-- ============================================================================
DROP POLICY IF EXISTS "Allow all on app_versions" ON app_versions;
DROP POLICY IF EXISTS "app_versions_select_policy" ON app_versions;

CREATE POLICY "app_versions_select_policy" ON app_versions
  FOR SELECT USING (auth.uid() IS NOT NULL);


-- ============================================================================
-- IMPORTANT: Backend / Webhook operations
-- ============================================================================
-- The webhook handler and tRPC routes need SUPABASE_SERVICE_ROLE_KEY
-- (not anon key) for server-side operations that bypass RLS.
--
-- In your .env:
--   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
--
-- In backend code, create a separate admin client:
--   const supabaseAdmin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
-- ============================================================================
