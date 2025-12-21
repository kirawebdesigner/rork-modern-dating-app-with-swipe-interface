import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
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
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle<SupabaseProfileRow>();

    if (error) {
      console.log('[Auth] fetchProfile error', error.message);
      return null;
    }

    if (!data) {
      console.log('[Auth] No profile row for user', userId);
      return null;
    }

    return mapProfile(data);
  } catch (error) {
    console.log('[Auth] fetchProfile exception', error);
    return null;
  }
};

const createProfile = async (userId: string, email: string | null, name: string) => {
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

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) {
    console.log('[Auth] createProfile error', error.message);
  }
};

export const [AuthProvider, useAuth] = createContextHook<AuthContextValue>(() => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const synchronizeUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const cachedProfile = deserializeProfile(await AsyncStorage.getItem(USER_STORAGE_KEY));
      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user ?? null;

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
      await synchronizeUser();
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [synchronizeUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) {
      throw new Error(error.message || 'Invalid credentials');
    }
    await synchronizeUser();
    
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('completed')
        .eq('id', data.user.id)
        .maybeSingle();
      
      if (profile?.completed) {
        router.replace('/(tabs)' as any);
      } else {
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

    const { data, error } = await supabase.auth.signUp({ 
      email: trimmedEmail, 
      password,
      options: {
        data: {
          name: trimmedName,
        }
      }
    });
    if (error) {
      throw new Error(error.message || 'Unable to create account');
    }

    const userId = data.user?.id;
    if (userId) {
      await createProfile(userId, data.user?.email ?? trimmedEmail, trimmedName);
    }

    await synchronizeUser();
    
    router.replace('/profile-setup' as any);
    
    return data;
  }, [synchronizeUser]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    await persistProfile(null);
    await AsyncStorage.removeItem('user_id');
    await AsyncStorage.removeItem('user_phone');
    setUser(null);
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
