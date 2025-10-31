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
        const [storedUserId, storedPhoneRaw] = await Promise.all([
          AsyncStorage.getItem('user_id'),
          AsyncStorage.getItem('user_phone'),
        ]);
        const storedPhone = storedPhoneRaw ? normalizePhone(storedPhoneRaw) : null;
        if (!mounted) return;

        const id = storedUserId ?? '';
        if (id) {
          const profile = await fetchProfileById(id);
          if (profile) {
            const next: AuthUser = { id: profile.id, email: '', name: profile.name, profile };
            setUser(next);
            return;
          } else {
            await AsyncStorage.removeItem('user_id');
          }
        }

        if (storedPhone) {
          const profile = await fetchProfileByPhone(storedPhone);
          if (profile) {
            const next: AuthUser = { id: profile.id, email: '', name: profile.name, profile };
            setUser(next);
            await AsyncStorage.setItem('user_id', profile.id);
          } else {
            await AsyncStorage.multiRemove(['user_phone', 'user_id']);
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

  const mapProfile = (data: any): User => ({
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
  });

  const fetchProfileById = async (id: string): Promise<User | null> => {
    try {
      console.log('[Auth] fetchProfileById', id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) {
        console.error('[Auth] fetchProfileById error:', JSON.stringify(error, null, 2));
        console.error('[Auth] Error message:', error.message);
        return null;
      }
      
      if (!data) {
        console.log('[Auth] No profile found for id', id);
        return null;
      }
      
      console.log('[Auth] Profile found by ID successfully');
      return mapProfile(data);
    } catch (err) {
      console.error('[Auth] fetchProfileById unexpected error:', err);
      if (err instanceof Error) {
        console.error('[Auth] Error message:', err.message);
      }
      return null;
    }
  };

  const fetchProfileByPhone = async (phone: string): Promise<User | null> => {
    try {
      const masked = phone.length > 4 ? phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4) : '***';
      console.log('[Auth] fetchProfileByPhone', masked);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();
      
      if (error) {
        console.error('[Auth] fetchProfileByPhone error:', JSON.stringify(error, null, 2));
        console.error('[Auth] Error message:', error.message);
        console.error('[Auth] Error details:', error.details);
        console.error('[Auth] Error hint:', error.hint);
        return null;
      }
      
      if (!data) {
        console.log('[Auth] No profile found for phone', masked);
        return null;
      }
      
      console.log('[Auth] Profile found successfully');
      return mapProfile(data);
    } catch (err) {
      console.error('[Auth] fetchProfileByPhone unexpected error:', err);
      console.error('[Auth] Error type:', typeof err);
      if (err instanceof Error) {
        console.error('[Auth] Error message:', err.message);
        console.error('[Auth] Error stack:', err.stack);
      }
      return null;
    }
  };

  const clearStorage = async () => {
    console.log('[Auth] clearing auth-related storage');
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      if (allKeys.length > 0) {
        await AsyncStorage.multiRemove(allKeys);
      }
    } catch (e) {
      console.log('[Auth] clear storage failed', e);
    }
  };

  const normalizePhone = (value: string) => value.replace(/\D/g, '');

  const login = useCallback(async (phone: string) => {
    const cleanPhone = normalizePhone(phone.trim());
    await clearStorage();
    setUser(null);
    await new Promise(resolve => setTimeout(resolve, 50));

    console.log('[Auth] Fetching profile for phone:', cleanPhone.slice(0, -4).replace(/\d/g, '*') + cleanPhone.slice(-4));
    const profile = await fetchProfileByPhone(cleanPhone);
    if (!profile) throw new Error('Phone number not found. Please sign up first.');

    console.log('[Auth] Profile fetched successfully:', profile.id);
    console.log('[Auth] Profile data:', JSON.stringify({
      id: profile.id,
      name: profile.name,
      completed: profile.completed,
      hasPhotos: profile.photos?.length > 0,
      hasBio: !!profile.bio
    }));
    
    await AsyncStorage.multiSet([
      ['user_phone', cleanPhone],
      ['user_id', profile.id],
    ]);
    
    await AsyncStorage.setItem('user_profile', JSON.stringify(profile));

    const next: AuthUser = { id: profile.id, email: '', name: profile.name, profile };
    setUser(next);
    console.log('[Auth] Login complete, user state updated');
  }, []);

  const signup = useCallback(async (phone: string, name: string) => {
    const cleanPhone = normalizePhone(phone.trim());
    const cleanName = name.trim();

    try {
      await clearStorage();
      setUser(null);
      const existing = await fetchProfileByPhone(cleanPhone);
      if (existing) throw new Error('Phone number already registered. Please login instead.');

      const { data, error } = await supabase
        .from('profiles')
        .insert({ phone: cleanPhone, name: cleanName })
        .select()
        .single();
      if (error) throw new Error('Failed to create account: ' + error.message);
      if (!data) throw new Error('Failed to create account: No data returned');

      const userId = data.id as string;

      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({ user_id: userId, phone_number: cleanPhone });
      if (membershipError) console.log('[Auth] membership creation error (non-fatal)', membershipError);

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
        console.log('[Auth] Referral processing failed (non-fatal)');
      }

      await AsyncStorage.multiSet([
        ['user_phone', cleanPhone],
        ['user_id', userId],
      ]);

      const profile = await fetchProfileById(userId);
      const next: AuthUser = { id: userId, email: '', name: cleanName, profile: profile ?? undefined };
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
    const [storedId, storedPhone] = await Promise.all([
      AsyncStorage.getItem('user_id'),
      AsyncStorage.getItem('user_phone'),
    ]);
    const profile = storedId ? await fetchProfileById(storedId) : (storedPhone ? await fetchProfileByPhone(storedPhone) : null);
    if (!profile) return;
    setUser(prev => {
      if (!prev) return prev;
      const next: AuthUser = { ...prev, id: profile.id, profile: profile ?? undefined, name: profile?.name ?? prev.name };
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
