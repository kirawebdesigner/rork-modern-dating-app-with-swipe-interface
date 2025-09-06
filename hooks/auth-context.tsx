import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { AuthUser, User } from '@/types';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadProfile: () => Promise<void>;
}

export const [AuthProvider, useAuth] = createContextHook<AuthContextType>(() => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        console.log('[Auth] Initializing session…');
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const sessionUser = data.session?.user ?? null;
        if (sessionUser) {
          const profile = await fetchProfile(sessionUser.id);
          const next: AuthUser = {
            id: sessionUser.id,
            email: sessionUser.email ?? '',
            name: profile?.name ?? (sessionUser.user_metadata?.name as string | undefined) ?? 'User',
            profile: profile ?? undefined,
          };
          setUser(next);
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error('[Auth] init error', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange', event);
      if (!session?.user) {
        setUser(null);
        return;
      }
      const profile = await fetchProfile(session.user.id);
      const next: AuthUser = {
        id: session.user.id,
        email: session.user.email ?? '',
        name: profile?.name ?? (session.user.user_metadata?.name as string | undefined) ?? 'User',
        profile: profile ?? undefined,
      };
      setUser(next);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (uid: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.error('[Auth] fetchProfile error', error);
      return null;
    }
    if (!data) return null;
    const u: User = {
      id: data.id as string,
      name: (data.name as string) ?? 'User',
      age: (data.age as number | null) ?? 0,
      gender: (data.gender as 'boy' | 'girl') ?? 'boy',
      bio: (data.bio as string) ?? '',
      photos: (data.photos as string[] | null) ?? [],
      interests: (data.interests as string[] | null) ?? [],
      location: { city: (data.city as string) ?? '' },
      verified: Boolean(data.verified),
      lastActive: data.last_active ? new Date(data.last_active as string) : undefined,
      ownedThemes: [],
      profileTheme: null,
    };
    return u;
  };

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const sessionUser = data.user;
    const profile = await fetchProfile(sessionUser.id);
    const next: AuthUser = {
      id: sessionUser.id,
      email: sessionUser.email ?? '',
      name: profile?.name ?? (sessionUser.user_metadata?.name as string | undefined) ?? 'User',
      profile: profile ?? undefined,
    };
    setUser(next);
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;

    let u = data.user;
    if (!data.session) {
      try {
        const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
        if (signInData.user) u = signInData.user;
      } catch (e) {
        console.log('[Auth] auto sign-in after signup failed', e);
      }
    }
    if (!u) return;

    try {
      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert({ id: u.id, name }, { onConflict: 'id' });
      if (upsertErr) console.log('[Auth] profile upsert error', upsertErr);
    } catch (e) {
      console.log('[Auth] profile upsert exception', e);
    }

    try {
      const code = await AsyncStorage.getItem('referrer_code');
      if (code) {
        const { data: refUser, error: refErr } = await supabase
          .from('profiles')
          .select('id')
          .or(`referral_code.eq.${code},id.eq.${code}`)
          .maybeSingle();
        if (!refErr && refUser && refUser.id !== u.id) {
          await supabase.from('profiles').update({ referred_by: refUser.id }).eq('id', u.id);
          await supabase.from('referrals').insert({ referrer_id: refUser.id, referred_user_id: u.id });
          await AsyncStorage.removeItem('referrer_code');
        }
      }
    } catch {}

    const profile = await fetchProfile(u.id);
    const next: AuthUser = {
      id: u.id,
      email: u.email ?? '',
      name: name ?? 'User',
      profile: profile ?? undefined,
    };
    setUser(next);
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.log('[Auth] signOut error, continuing', e);
    }
    try {
      const keys = [
        'user_profile',
        'tier',
        'credits',
        'swipe_history',
        'filters_state',
        'blocked_ids',
        'membership_tier',
        'membership_credits',
        'remaining_daily_messages',
        'remaining_profile_views',
        'remaining_right_swipes',
        'remaining_compliments',
        'last_reset',
        'monthly_allowances',
        'last_allowance_grant',
      ];
      await AsyncStorage.multiRemove(keys);
    } catch (e) {
      console.log('[Auth] clear storage failed', e);
    }
    setUser(null);
  }, []);

  const reloadProfile = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return;
    const profile = await fetchProfile(uid);
    setUser(prev => {
      if (!prev) return prev;
      const next: AuthUser = { ...prev, profile: profile ?? undefined, name: profile?.name ?? prev.name };
      return next;
    });
  }, []);

  return useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    reloadProfile,
  }), [user, isLoading, login, signup, logout, reloadProfile]);
});