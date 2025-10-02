import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { AuthUser, User } from '@/types';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string) => Promise<void>;
  signup: (phone: string, name: string) => Promise<void>;
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
        const storedPhone = await AsyncStorage.getItem('user_phone');
        if (!mounted) return;
        
        if (storedPhone) {
          const profile = await fetchProfileByPhone(storedPhone);
          if (profile) {
            const next: AuthUser = {
              id: profile.id,
              email: '',
              name: profile.name,
              profile: profile,
            };
            setUser(next);
          } else {
            await AsyncStorage.removeItem('user_phone');
            setUser(null);
          }
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

    return () => {
      mounted = false;
    };
  }, []);

  const fetchProfileByPhone = async (phone: string): Promise<User | null> => {
    console.log('[Auth] fetchProfileByPhone', phone);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();
    
    if (error) {
      console.error('[Auth] fetchProfileByPhone error', error);
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

  const login = useCallback(async (phone: string) => {
    console.log('[Auth] login attempt', { phone });
    const cleanPhone = phone.trim();
    
    const profile = await fetchProfileByPhone(cleanPhone);
    if (!profile) {
      throw new Error('Phone number not found. Please sign up first.');
    }

    await AsyncStorage.setItem('user_phone', cleanPhone);
    
    const next: AuthUser = {
      id: profile.id,
      email: '',
      name: profile.name,
      profile: profile,
    };
    console.log('[Auth] login complete, user set', next);
    setUser(next);
  }, []);

  const signup = useCallback(async (phone: string, name: string) => {
    console.log('[Auth] signup start', { phone, name });
    const cleanPhone = phone.trim();
    const cleanName = name.trim();

    const existing = await fetchProfileByPhone(cleanPhone);
    if (existing) {
      throw new Error('Phone number already registered. Please login instead.');
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert({ phone: cleanPhone, name: cleanName })
      .select()
      .single();

    if (error) {
      console.log('[Auth] signup error', error);
      throw new Error('Failed to create account: ' + error.message);
    }

    const userId = data.id as string;

    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({ user_id: userId });

    if (membershipError) {
      console.log('[Auth] membership creation error', membershipError);
    }

    try {
      const code = await AsyncStorage.getItem('referrer_code');
      if (code) {
        const { data: refUser, error: refErr } = await supabase
          .from('profiles')
          .select('id')
          .or(`referral_code.eq.${code},id.eq.${code}`)
          .maybeSingle();
        if (!refErr && refUser && refUser.id !== userId) {
          await supabase.from('profiles').update({ referred_by: refUser.id }).eq('id', userId);
          await supabase.from('referrals').insert({ referrer_id: refUser.id, referred_user_id: userId });
          await AsyncStorage.removeItem('referrer_code');
        }
      }
    } catch {}

    await AsyncStorage.setItem('user_phone', cleanPhone);

    const profile = await fetchProfileByPhone(cleanPhone);
    const next: AuthUser = {
      id: userId,
      email: '',
      name: cleanName,
      profile: profile ?? undefined,
    };
    console.log('[Auth] signup complete, user set', next);
    setUser(next);
  }, []);

  const logout = useCallback(async () => {
    try {
      const keys = [
        'user_phone',
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
    const storedPhone = await AsyncStorage.getItem('user_phone');
    if (!storedPhone) return;
    
    const profile = await fetchProfileByPhone(storedPhone);
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
