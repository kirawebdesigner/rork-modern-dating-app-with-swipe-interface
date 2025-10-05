import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { AuthUser, User, ThemeId } from '@/types';
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
    if (!data) {
      console.log('[Auth] No profile found for phone:', phone);
      return null;
    }
    
    console.log('[Auth] Profile found:', data);
    const u: User = {
      id: data.id as string,
      name: (data.name as string) ?? 'User',
      age: (data.age as number | null) ?? 0,
      birthday: data.birthday ? new Date(data.birthday as string) : undefined,
      gender: (data.gender as 'boy' | 'girl') ?? 'boy',
      interestedIn: (data.interested_in as 'boy' | 'girl' | null) ?? undefined,
      bio: (data.bio as string) ?? '',
      photos: (data.photos as string[] | null) ?? [],
      interests: (data.interests as string[] | null) ?? [],
      location: { 
        city: (data.city as string) ?? '',
        latitude: data.latitude ? Number(data.latitude) : undefined,
        longitude: data.longitude ? Number(data.longitude) : undefined,
      },
      heightCm: data.height_cm ? Number(data.height_cm) : undefined,
      education: data.education ? String(data.education) : undefined,
      verified: Boolean(data.verified),
      lastActive: data.last_active ? new Date(data.last_active as string) : undefined,
      ownedThemes: ((data.owned_themes as string[] | null) ?? []) as ThemeId[],
      profileTheme: ((data.profile_theme as string | null) ?? null) as ThemeId | null,
      completed: Boolean(data.completed),
    };
    return u;
  };

  const clearStorage = async () => {
    console.log('[Auth] clearing storage');
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('[Auth] clearing all AsyncStorage keys:', allKeys.length);
      await AsyncStorage.clear();
    } catch (e) {
      console.log('[Auth] clear storage failed', e);
    }
  };

  const login = useCallback(async (phone: string) => {
    console.log('[Auth] login attempt', { phone });
    const cleanPhone = phone.trim();
    
    console.log('[Auth] Clearing all storage before login');
    await clearStorage();
    setUser(null);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const profile = await fetchProfileByPhone(cleanPhone);
    if (!profile) {
      throw new Error('Phone number not found. Please sign up first.');
    }

    console.log('[Auth] Storing new phone:', cleanPhone);
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

    try {
      await clearStorage();
      setUser(null);
      
      const existing = await fetchProfileByPhone(cleanPhone);
      if (existing) {
        console.log('[Auth] Phone already exists');
        throw new Error('Phone number already registered. Please login instead.');
      }

      console.log('[Auth] Creating profile in Supabase');
      const { data, error } = await supabase
        .from('profiles')
        .insert({ phone: cleanPhone, name: cleanName })
        .select()
        .single();

      if (error) {
        console.log('[Auth] signup error', error);
        throw new Error('Failed to create account: ' + error.message);
      }

      if (!data) {
        console.log('[Auth] No data returned from insert');
        throw new Error('Failed to create account: No data returned');
      }

      const userId = data.id as string;
      console.log('[Auth] Profile created with ID:', userId);

      console.log('[Auth] Creating membership record');
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({ user_id: userId, phone_number: cleanPhone });

      if (membershipError) {
        console.log('[Auth] membership creation error (non-fatal)', membershipError);
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
      } catch (refErr) {
        console.log('[Auth] Referral processing failed (non-fatal)', refErr);
      }

      console.log('[Auth] Storing phone in AsyncStorage');
      await AsyncStorage.setItem('user_phone', cleanPhone);

      console.log('[Auth] Fetching created profile');
      const profile = await fetchProfileByPhone(cleanPhone);
      const next: AuthUser = {
        id: userId,
        email: '',
        name: cleanName,
        profile: profile ?? undefined,
      };
      console.log('[Auth] signup complete, user set', next);
      setUser(next);
    } catch (error) {
      console.log('[Auth] signup failed with error:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    console.log('[Auth] logout called');
    await clearStorage();
    setUser(null);
    console.log('[Auth] logout complete');
  }, []);

  const reloadProfile = useCallback(async () => {
    console.log('[Auth] reloadProfile called');
    const storedPhone = await AsyncStorage.getItem('user_phone');
    if (!storedPhone) {
      console.log('[Auth] No stored phone, cannot reload');
      return;
    }
    
    console.log('[Auth] Reloading profile for phone:', storedPhone);
    const profile = await fetchProfileByPhone(storedPhone);
    if (!profile) {
      console.log('[Auth] Profile not found during reload');
      return;
    }
    
    setUser(prev => {
      if (!prev) return prev;
      const next: AuthUser = { ...prev, profile: profile ?? undefined, name: profile?.name ?? prev.name };
      console.log('[Auth] Profile reloaded successfully');
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
