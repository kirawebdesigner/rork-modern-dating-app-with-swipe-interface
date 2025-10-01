import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { AuthUser, User } from '@/types';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  signup: (emailOrPhone: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadProfile: () => Promise<void>;
}

export const [AuthProvider, useAuth] = createContextHook<AuthContextType>(() => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    const ensureProfile = async (uid: string) => {
      try {
        const { data: au } = await supabase.auth.getUser();
        const metaName = (au.user?.user_metadata?.name as string | undefined) ?? 'User';
        const { error: upErr } = await supabase
          .from('profiles')
          .upsert({ id: uid, name: metaName, email: au.user?.email, phone: au.user?.phone }, { onConflict: 'id' });
        if (upErr) console.log('[Auth] ensureProfile upsert error', upErr);
      } catch (e) {
        console.log('[Auth] ensureProfile exception', e);
      }
    };

    const init = async () => {
      try {
        console.log('[Auth] Initializing session…');
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const sessionUser = data.session?.user ?? null;
        if (sessionUser) {
          let profile = await fetchProfile(sessionUser.id);
          if (!profile) {
            await ensureProfile(sessionUser.id);
            profile = await fetchProfile(sessionUser.id);
          }
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
      let profile = await fetchProfile(session.user.id);
      if (!profile) {
        await ensureProfile(session.user.id);
        profile = await fetchProfile(session.user.id);
      }
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

  const login = useCallback(async (emailOrPhone: string, password: string) => {
    console.log('[Auth] login attempt', { emailOrPhone });
    const isPhone = /^\+?[0-9]{10,15}$/.test(emailOrPhone.replace(/\s/g, ''));
    const credentials = isPhone ? { phone: emailOrPhone, password } : { email: emailOrPhone, password };
    const { data, error } = await supabase.auth.signInWithPassword(credentials as any);
    if (error) {
      console.log('[Auth] login error', error);
      throw error;
    }
    const sessionUser = data.user;
    console.log('[Auth] login success, fetching profile for', sessionUser.id);
    let profile = await fetchProfile(sessionUser.id);
    if (!profile) {
      console.log('[Auth] no profile found, creating one');
      try {
        const metaName = (sessionUser.user_metadata?.name as string | undefined) ?? 'User';
        const { error: upsertErr } = await supabase.from('profiles').upsert({ id: sessionUser.id, name: metaName, email: sessionUser.email, phone: sessionUser.phone }, { onConflict: 'id' });
        if (upsertErr) console.log('[Auth] profile upsert error', upsertErr);
      } catch (e) {
        console.log('[Auth] profile upsert exception', e);
      }
      profile = await fetchProfile(sessionUser.id);
    }
    const next: AuthUser = {
      id: sessionUser.id,
      email: sessionUser.email ?? '',
      name: profile?.name ?? (sessionUser.user_metadata?.name as string | undefined) ?? 'User',
      profile: profile ?? undefined,
    };
    console.log('[Auth] login complete, user set', next);
    setUser(next);
  }, []);

  const signup = useCallback(async (emailOrPhone: string, password: string, name: string) => {
    console.log('[Auth] signup start', { emailOrPhone });
    const isPhone = /^\+?[0-9]{10,15}$/.test(emailOrPhone.replace(/\s/g, ''));
    const signupData = isPhone 
      ? { phone: emailOrPhone, password, options: { data: { name } } }
      : { email: emailOrPhone, password, options: { data: { name } } };
    const { data, error } = await supabase.auth.signUp(signupData as any);
    if (error) {
      console.log('[Auth] signUp error', error);
      throw error;
    }

    if (!data.session) {
      console.log('[Auth] No session after signUp — confirmation required');
      throw new Error(isPhone ? 'PHONE_CONFIRMATION_REQUIRED' : 'EMAIL_CONFIRMATION_REQUIRED');
    }

    console.log('[Auth] signup session created, upserting profile');
    try {
      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert({ id: data.user!.id, name, email: data.user!.email, phone: data.user!.phone }, { onConflict: 'id' });
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
        if (!refErr && refUser && refUser.id !== data.user!.id) {
          await supabase.from('profiles').update({ referred_by: refUser.id }).eq('id', data.user!.id);
          await supabase.from('referrals').insert({ referrer_id: refUser.id, referred_user_id: data.user!.id });
          await AsyncStorage.removeItem('referrer_code');
        }
      }
    } catch {}

    const profile = await fetchProfile(data.user!.id);
    const next: AuthUser = {
      id: data.user!.id,
      email: data.user!.email ?? '',
      name: name ?? 'User',
      profile: profile ?? undefined,
    };
    console.log('[Auth] signup complete, user set', next);
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
    try {
      if (typeof window !== 'undefined') {
        const ls = window.localStorage;
        const toRemove: string[] = [];
        for (let i = 0; i < ls.length; i++) {
          const k = ls.key(i);
          if (k && (k.startsWith('sb-') || k.includes('supabase'))) {
            toRemove.push(k);
          }
        }
        toRemove.forEach((k) => ls.removeItem(k));
        console.log('[Auth] Cleared web localStorage keys', toRemove);
      }
    } catch (e) {
      console.log('[Auth] localStorage clear failed (web)', e);
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