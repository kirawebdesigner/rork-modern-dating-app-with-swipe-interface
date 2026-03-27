-- 1. Create Blocks Table
CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS for blocks
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Blocks Policies
CREATE POLICY "Users can view their own blocks" ON public.blocks
    FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others" ON public.blocks
    FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock others" ON public.blocks
    FOR DELETE USING (auth.uid() = blocker_id);

-- 2. Trigger to automatically create conversation on match
CREATE OR REPLACE FUNCTION public.handle_new_match()
RETURNS TRIGGER AS $$
BEGIN
    -- Create conversation record using match ID
    INSERT INTO public.conversations (id, created_at, created_by)
    VALUES (NEW.id, NEW.matched_at, NEW.user1_id)
    ON CONFLICT (id) DO NOTHING;

    -- Add participants
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (NEW.id, NEW.user1_id), (NEW.id, NEW.user2_id)
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_match_created
    AFTER INSERT ON public.matches
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_match();

-- 3. Optimization: Add distance calculation support to Supabase (Optional but good for scalability)
-- This requires postgis extension to be enabled in Supabase dashboard.
-- For now, we'll keep the JS calculation but add a placeholder for future SQL distance queries.
