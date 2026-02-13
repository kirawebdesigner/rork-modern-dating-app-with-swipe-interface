import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase, TEST_MODE } from '@/lib/supabase';
import { AuthUser, User, ThemeId } from '@/types';
import { router } from 'expo-router';

type SupabaseProfileRow = {
  id: string;
  name: string | null;
  age: number | null;
  birthday: string | null;
  gender: 'boy' | 'girl' | null;
  interested_in: 'boy' | 'girl' | null;
  bio: string | null;
  photos: string[] | null;
  interests: string[] | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  height_cm: number | null;
  education: string | null;
  instagram: string | null;
  phone: string | null;
  email: string | null;
  verified: boolean | null;
  is_premium: boolean | null;
  last_active: string | null;
  owned_themes: ThemeId[] | null;
  profile_theme: ThemeId | null;
  completed: boolean | null;
};

interface SerializedUser extends Omit<User, 'birthday' | 'lastActive'> {
  birthday: string | null;
  lastActive: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<any>;
  logout: () => Promise<void>;
  reloadProfile: () => Promise<void>;
}

const USER_STORAGE_KEY = 'user_profile';

const mapProfile = (row: SupabaseProfileRow): User => {
  const ownedThemes: ThemeId[] = Array.isArray(row.owned_themes) ? row.owned_themes : [];
  const profileTheme: ThemeId | null = (row.profile_theme ?? null) as ThemeId | null;
  return {
    id: row.id,
    name: row.name ?? 'User',
    age: Number(row.age ?? 0),
    birthday: row.birthday ? new Date(row.birthday) : undefined,
    gender: (row.gender ?? 'boy') as 'boy' | 'girl',
    interestedIn: row.interested_in ?? undefined,
    bio: row.bio ?? '',
    photos: Array.isArray(row.photos) ? row.photos : [],
    interests: Array.isArray(row.interests) ? row.interests : [],
    location: {
      city: row.city ?? '',
      latitude: row.latitude ?? undefined,
      longitude: row.longitude ?? undefined,
    },
    heightCm: row.height_cm ?? undefined,
    education: row.education ?? undefined,
    instagram: row.instagram ?? undefined,
    phone: row.phone ?? null,
    email: row.email ?? null,
    verified: Boolean(row.verified),
    isPremium: Boolean(row.is_premium),
    lastActive: row.last_active ? new Date(row.last_active) : undefined,
    privacy: undefined,
    credits: undefined,
    membershipTier: undefined,
    ownedThemes,
    profileTheme,
    completed: Boolean(row.completed),
  };
};

const serializeProfile = (profile: User): SerializedUser => ({
  ...profile,
  birthday: profile.birthday ? profile.birthday.toISOString() : null,
  lastActive: profile.lastActive ? profile.lastActive.toISOString() : null,
});

const deserializeProfile = (raw: string | null): User | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SerializedUser;
    return {
      ...parsed,
      birthday: parsed.birthday ? new Date(parsed.birthday) : undefined,
      lastActive: parsed.lastActive ? new Date(parsed.lastActive) : undefined,
    } as User;
  } catch (error) {
    console.log('[Auth] Failed to deserialize cached profile', error);
    return null;
  }
};

const persistProfile = async (profile: User | null) => {
  if (!profile) {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(serializeProfile(profile)));
};

const fetchProfile = async (userId: string): Promise<User | null> => {
  if (TEST_MODE) {
    console.log('[Auth] TEST MODE: Using local profile for', userId);
    return null;
  }
  
  try {
    let data: any = null;
    let error: any = null;
    try {
      const result = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle<SupabaseProfileRow>();
      data = result.data;
      error = result.error;
    } catch (networkErr: any) {
      console.log('[Auth] fetchProfile network error:', networkErr?.message);
      return null;
    }

    if (error) {
      console.log('[Auth] fetchProfile error', error.message);
      return null;
    }

    if (!data) {
      console.log('[Auth] No profile row for user', userId);
      return null;
    }

    return mapProfile(data);
  } catch (error: any) {
    console.log('[Auth] fetchProfile exception', error?.message);
    return null;
  }
};

const createProfile = async (userId: string, email: string | null, name: string) => {
  if (TEST_MODE) {
    console.log('[Auth] TEST MODE: Skipping profile creation on server');
    return;
  }
  
  const payload = {
    id: userId,
    email,
    phone: null,
    name,
    bio: '',
    photos: [],
    interests: [],
    city: '',
    verified: false,
    owned_themes: [] as ThemeId[],
    profile_theme: null as ThemeId | null,
    completed: false,
  };

  try {
    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.log('[Auth] createProfile error', error.message);
    }
  } catch (e: any) {
    console.log('[Auth] createProfile network error:', e?.message);
  }
};

export const [AuthProvider, useAuth] = createContextHook<AuthContextValue>(() => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isLoggingOutRef = React.useRef(false);

  const synchronizeUser = useCallback(async () => {
    if (isLoggingOutRef.current) {
      console.log('[Auth] Skipping synchronizeUser during logout');
      return;
    }
    setIsLoading(true);
    try {
      const cachedProfile = deserializeProfile(await AsyncStorage.getItem(USER_STORAGE_KEY));
      
      if (TEST_MODE) {
        const cachedUserId = await AsyncStorage.getItem('user_id');
        const cachedUserEmail = await AsyncStorage.getItem('user_email');
        
        if (!cachedUserId) {
          console.log('[Auth] TEST MODE: No cached user, waiting for signup/login');
          setUser(null);
          await persistProfile(null);
          return;
        }
        
        console.log('[Auth] TEST MODE: Using cached user', cachedUserId);
        const next: AuthUser = {
          id: cachedUserId,
          email: cachedUserEmail ?? 'test@example.com',
          name: cachedProfile?.name ?? 'Test User',
          profile: cachedProfile ?? undefined,
        };
        setUser(next);
        return;
      }
      
      let currentUser = null;
      try {
        const result = await supabase.auth.getUser();
        currentUser = result?.data?.user ?? null;
        
        if (!currentUser && cachedProfile) {
          const cachedUserId = await AsyncStorage.getItem('user_id');
          if (cachedUserId) {
            console.log('[Auth] No auth session but have cached profile, using cache');
            setUser({
              id: cachedUserId,
              email: cachedProfile.email ?? '',
              name: cachedProfile.name ?? 'User',
              profile: cachedProfile,
            });
            return;
          }
        }
      } catch (fetchErr) {
        console.log('[Auth] Network error fetching user (using cached):', fetchErr);
        if (cachedProfile) {
          const cachedUserId = await AsyncStorage.getItem('user_id');
          if (cachedUserId) {
            setUser({
              id: cachedUserId,
              email: cachedProfile.email ?? '',
              name: cachedProfile.name ?? 'User',
              profile: cachedProfile,
            });
            return;
          }
        }
        setUser(null);
        return;
      }

      if (!currentUser) {
        setUser(null);
        await persistProfile(null);
        return;
      }

      const profile = cachedProfile && cachedProfile.id === currentUser.id
        ? cachedProfile
        : await fetchProfile(currentUser.id);

      if (!profile) {
        await createProfile(currentUser.id, currentUser.email ?? null, currentUser.email?.split('@')[0] ?? 'User');
      }

      const finalProfile = profile ?? await fetchProfile(currentUser.id);
      if (finalProfile) {
        await persistProfile(finalProfile);
      }

      await AsyncStorage.setItem('user_id', currentUser.id);
      if (finalProfile?.phone) {
        await AsyncStorage.setItem('user_phone', finalProfile.phone);
      } else {
        await AsyncStorage.removeItem('user_phone');
      }

      const next: AuthUser = {
        id: currentUser.id,
        email: currentUser.email ?? '',
        name: finalProfile?.name ?? currentUser.email?.split('@')[0] ?? 'User',
        profile: finalProfile ?? undefined,
      };
      setUser(next);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (!isMounted) return;
      await synchronizeUser();
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(async () => {
      if (!isMounted) return;
      try {
        await synchronizeUser();
      } catch (e) {
        console.log('[Auth] onAuthStateChange sync error:', e);
      }
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [synchronizeUser]);

  const login = useCallback(async (email: string, password: string) => {
    if (TEST_MODE) {
      console.log('[Auth] TEST MODE: Auto-login for', email);
      const userId = email.split('@')[0] || 'testuser';
      await AsyncStorage.setItem('user_id', userId);
      await AsyncStorage.setItem('user_email', email);
      await synchronizeUser();
      
      const cachedProfile = deserializeProfile(await AsyncStorage.getItem(USER_STORAGE_KEY));
      if (cachedProfile?.completed) {
        router.replace('/(tabs)' as any);
      } else {
        router.replace('/profile-setup' as any);
      }
      return;
    }
    
    let loginData: any = null;
    let loginError: any = null;
    try {
      const result = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      loginData = result.data;
      loginError = result.error;
    } catch (networkErr: any) {
      console.log('[Auth] Login network error:', networkErr?.message);
      throw new Error('Network unavailable. Please check your connection.');
    }
    if (loginError) {
      throw new Error(loginError.message || 'Invalid credentials');
    }
    await synchronizeUser();
    
    if (loginData?.user) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('completed')
          .eq('id', loginData.user.id)
          .maybeSingle();
        
        if (profile?.completed) {
          router.replace('/(tabs)' as any);
        } else {
          router.replace('/profile-setup' as any);
        }
      } catch (e: any) {
        console.log('[Auth] Error checking profile after login:', e?.message);
        router.replace('/profile-setup' as any);
      }
    }
  }, [synchronizeUser]);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedEmail || !trimmedName) {
      throw new Error('Email and name are required');
    }

    if (TEST_MODE) {
      console.log('[Auth] TEST MODE: Auto-signup for', trimmedEmail);
      const userId = trimmedEmail.split('@')[0] || 'testuser';
      await AsyncStorage.setItem('user_id', userId);
      await AsyncStorage.setItem('user_email', trimmedEmail);
      await synchronizeUser();
      router.replace('/profile-setup' as any);
      return { user: { id: userId, email: trimmedEmail } };
    }

    let data: any = null;
    let signupError: any = null;
    try {
      const result = await supabase.auth.signUp({ 
        email: trimmedEmail, 
        password,
        options: {
          data: {
            name: trimmedName,
          }
        }
      });
      data = result.data;
      signupError = result.error;
    } catch (networkErr: any) {
      console.log('[Auth] Signup network error:', networkErr?.message);
      throw new Error('Network unavailable. Please check your connection.');
    }
    if (signupError) {
      throw new Error(signupError.message || 'Unable to create account');
    }

    const userId = data?.user?.id;
    if (userId) {
      await createProfile(userId, data?.user?.email ?? trimmedEmail, trimmedName);

      try {
        const storedRef = await AsyncStorage.getItem('referrer_code');
        if (storedRef) {
          console.log('[Auth] Processing referral code:', storedRef);
          try {
            const { data: referrer } = await supabase
              .from('profiles')
              .select('id')
              .eq('referral_code', storedRef)
              .maybeSingle();

            if (referrer?.id && referrer.id !== userId) {
              await supabase.from('referrals').insert({
                referrer_id: referrer.id,
                referred_user_id: userId,
              });
              await supabase.from('profiles').update({ referred_by: referrer.id }).eq('id', userId);
              console.log('[Auth] Referral recorded:', referrer.id, '->', userId);
            }
          } catch (refNetErr: any) {
            console.log('[Auth] Referral network error:', refNetErr?.message);
          }
          await AsyncStorage.removeItem('referrer_code');
        }
      } catch (refErr: any) {
        console.log('[Auth] Referral tracking error:', refErr?.message);
      }
    }

    await synchronizeUser();
    
    router.replace('/profile-setup' as any);
    
    return data;
  }, [synchronizeUser]);

  const logout = useCallback(async () => {
    console.log('[Auth] Logout started');
    isLoggingOutRef.current = true;
    
    setUser(null);
    
    const keysToRemove = [
      'user_profile',
      'user_id',
      'user_email',
      'user_phone',
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
      'referrer_code',
    ];
    
    await Promise.all(keysToRemove.map(k => AsyncStorage.removeItem(k).catch(() => {})));
    console.log('[Auth] All storage keys cleared');
    
    try {
      if (!TEST_MODE) {
        await supabase.auth.signOut({ scope: 'local' }).catch(e => console.log('[Auth] signOut network error:', e));
      }
    } catch (e) {
      console.log('[Auth] signOut error (continuing):', e);
    }
    
    setIsLoading(false);
    isLoggingOutRef.current = false;
    console.log('[Auth] Logout completed');
  }, []);

  const reloadProfile = useCallback(async () => {
    if (!user) return;
    const profile = await fetchProfile(user.id);
    if (profile) {
      await persistProfile(profile);
      if (profile.phone) {
        await AsyncStorage.setItem('user_phone', profile.phone);
      }
      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          name: profile.name ?? prev.name,
          profile,
        } as AuthUser;
      });
    }
  }, [user]);

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
