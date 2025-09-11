import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { User, Match, SwipeAction, MembershipTier, ThemeId } from '@/types';
import { sendPushToUser } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

type InterestedIn = 'girl' | 'boy';

interface FiltersState {
  interestedIn: InterestedIn;
  locationLabel: string;
  distanceKm: number;
  ageMin: number;
  ageMax: number;
  latitude?: number;
  longitude?: number;
  showVerifiedOnly?: boolean;
  education?: string;
  heightRange?: string;
  specificLocation?: string;
}

interface AppContextType {
  currentProfile: User | null;
  potentialMatches: User[];
  matches: Match[];
  swipeHistory: SwipeAction[];
  tier: MembershipTier;
  credits: number;
  filters: FiltersState;
  setFilters: (next: FiltersState) => Promise<void>;
  setCurrentProfile: (profile: User) => Promise<void>;
  updateProfile: (patch: Partial<User>) => Promise<void>;
  swipeUser: (userId: string, action: 'like' | 'nope' | 'superlike') => void;
  setTier: (tier: MembershipTier) => Promise<void>;
  addCredits: (n: number) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  blockedIds: string[];
  unlockTheme: (theme: ThemeId) => Promise<void>;
  setProfileTheme: (theme: ThemeId | null) => Promise<void>;
}

export const [AppProvider, useApp] = createContextHook<AppContextType>(() => {
  const [currentProfile, setCurrentProfileState] = useState<User | null>(null);
  const [potentialMatches, setPotentialMatches] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [swipeHistory, setSwipeHistory] = useState<SwipeAction[]>([]);
  const [tier, setTierState] = useState<MembershipTier>('free');
  const [credits, setCredits] = useState<number>(0);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [filters, setFiltersState] = useState<FiltersState>({
    interestedIn: 'girl',
    locationLabel: 'Ethiopia',
    distanceKm: 40,
    ageMin: 20,
    ageMax: 28,
    latitude: undefined,
    longitude: undefined,
    showVerifiedOnly: false,
  });

  useEffect(() => {
    loadAppData();
  }, []);

  useEffect(() => {
    refilterPotential();
  }, [filters, swipeHistory, blockedIds]);

  const normalizeProfile = (p: User | null): User | null => {
    if (!p) return null;
    const ownedThemes: ThemeId[] = Array.isArray(p.ownedThemes) ? (p.ownedThemes as ThemeId[]) : [];
    const profileTheme: ThemeId | null = (p.profileTheme ?? null) as ThemeId | null;
    return { ...p, ownedThemes, profileTheme } as User;
  };

  const loadAppData = async () => {
    try {
      const [profile, storedTier, storedCredits, history, storedFilters, storedBlocked] = await Promise.all([
        AsyncStorage.getItem('user_profile'),
        AsyncStorage.getItem('tier'),
        AsyncStorage.getItem('credits'),
        AsyncStorage.getItem('swipe_history'),
        AsyncStorage.getItem('filters_state'),
        AsyncStorage.getItem('blocked_ids'),
      ]);

      if (profile) setCurrentProfileState(normalizeProfile(JSON.parse(profile)));
      if (storedTier) setTierState(JSON.parse(storedTier));
      if (storedCredits) setCredits(JSON.parse(storedCredits));
      if (history) setSwipeHistory(JSON.parse(history));
      if (storedBlocked) setBlockedIds(JSON.parse(storedBlocked));

      try {
        const { data: authUser } = await supabase.auth.getUser();
        const uid = authUser?.user?.id ?? null;
        if (!profile && uid) {
          const { data: me, error: meErr } = await supabase
            .from('profiles')
            .select('id,name,age,gender,interested_in,bio,photos,interests,city,latitude,longitude,height_cm,education,verified,last_active,profile_theme,owned_themes,profile_complete')
            .eq('id', uid)
            .maybeSingle();
          if (!meErr && me) {
            const mappedMe: User = {
              id: String(me.id),
              name: String(me.name ?? 'Me'),
              age: Number(me.age ?? 0),
              gender: (me.gender as 'boy' | 'girl') ?? 'boy',
              interestedIn: (me.interested_in as 'boy' | 'girl' | null) ?? undefined,
              bio: String(me.bio ?? ''),
              photos: Array.isArray(me.photos) ? (me.photos as string[]) : [],
              interests: Array.isArray(me.interests) ? (me.interests as string[]) : [],
              location: { city: String(me.city ?? ''), latitude: me.latitude ? Number(me.latitude) : undefined, longitude: me.longitude ? Number(me.longitude) : undefined },
              heightCm: typeof me.height_cm === 'number' ? Number(me.height_cm) : undefined,
              education: me.education ? String(me.education) : undefined,
              verified: Boolean(me.verified),
              lastActive: me.last_active ? new Date(String(me.last_active)) : undefined,
              ownedThemes: Array.isArray(me.owned_themes) ? (me.owned_themes as ThemeId[]) : [],
              profileTheme: (me.profile_theme as ThemeId | null) ?? null,
              profileComplete: Boolean((me as any).profile_complete ?? false),
            } as User;
            setCurrentProfileState(mappedMe);
            await AsyncStorage.setItem('user_profile', JSON.stringify(mappedMe));
            if (!storedFilters) {
              const defaultInterestedIn: InterestedIn = mappedMe.gender === 'girl' ? 'boy' : 'girl';
              setFiltersState(prev => ({ ...prev, interestedIn: defaultInterestedIn }));
              await AsyncStorage.setItem('filters_state', JSON.stringify({
                ...(JSON.parse((await AsyncStorage.getItem('filters_state')) ?? '{}') || {}),
                interestedIn: defaultInterestedIn,
              }));
            }
          }
        }
      } catch (meLoadErr) {
        console.log('[App] load self profile failed', meLoadErr);
      }

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id,name,age,gender,interested_in,bio,photos,interests,city,latitude,longitude,height_cm,education,verified,last_active,profile_theme,owned_themes')
        .limit(100);
      if (error) {
        console.log('[App] load profiles error', error.message);
        setPotentialMatches([]);
      } else {
        const mapped: User[] = (profiles as any[]).map((row) => ({
          id: String(row.id),
          name: String(row.name ?? 'User'),
          age: Number(row.age ?? 0),
          gender: (row.gender as 'boy' | 'girl') ?? 'boy',
          interestedIn: (row.interested_in as 'boy' | 'girl' | null) ?? undefined,
          bio: String(row.bio ?? ''),
          photos: Array.isArray(row.photos) ? (row.photos as string[]) : [],
          interests: Array.isArray(row.interests) ? (row.interests as string[]) : [],
          location: { city: String(row.city ?? ''), latitude: row.latitude ? Number(row.latitude) : undefined, longitude: row.longitude ? Number(row.longitude) : undefined },
          heightCm: typeof row.height_cm === 'number' ? Number(row.height_cm) : undefined,
          education: row.education ? String(row.education) : undefined,
          verified: Boolean(row.verified),
          lastActive: row.last_active ? new Date(String(row.last_active)) : undefined,
          ownedThemes: Array.isArray(row.owned_themes) ? (row.owned_themes as ThemeId[]) : [],
          profileTheme: (row.profile_theme as ThemeId | null) ?? null,
          profileComplete: Boolean((row as any).profile_complete ?? false),
        } as User));
        if (storedFilters) {
          setFiltersState(JSON.parse(storedFilters));
        } else if (currentProfile) {
          const defaultInterestedIn: InterestedIn = ((currentProfile.interestedIn as InterestedIn | undefined) ?? (currentProfile.gender === 'girl' ? 'boy' : 'girl'));
          setFiltersState(prev => ({ ...prev, interestedIn: defaultInterestedIn }));
        }
        const filtered = applyFilters(mapped, {
          ...filters,
          interestedIn: (storedFilters ? JSON.parse(storedFilters).interestedIn : (currentProfile ? ((currentProfile.interestedIn as InterestedIn | undefined) ?? (currentProfile.gender === 'girl' ? 'boy' : 'girl')) : filters.interestedIn)) as InterestedIn,
        }, JSON.parse(history ?? '[]'), JSON.parse(storedBlocked ?? '[]'));
        setPotentialMatches(filtered);
      }

      const { data: matchesRows } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id, matched_at');
      if (matchesRows) {
        const m: Match[] = (matchesRows as any[]).map((r) => ({ id: String(r.id), user: { id: '', name: '', age: 0, gender: 'boy', bio: '', photos: [], interests: [], location: { city: '' } }, matchedAt: new Date(String(r.matched_at)) } as Match));
        setMatches(m);
      }
    } catch (error) {
      console.error('Error loading app data:', error);
    }
  };

  const applyFilters = (users: User[], f: FiltersState, swiped: SwipeAction[], blocked: string[]) => {
    const swipedIds = new Set(swiped.map(s => s.userId));
    const blockedSet = new Set(blocked);
    return users.filter(u => {
      if (swipedIds.has(u.id)) return false;
      if (blockedSet.has(u.id)) return false;
      if (f.interestedIn === 'girl' && u.gender !== 'girl') return false;
      if (f.interestedIn === 'boy' && u.gender !== 'boy') return false;
      if (currentProfile?.gender && u.interestedIn && u.interestedIn !== currentProfile.gender) return false;
      if (u.age < f.ageMin || u.age > f.ageMax) return false;
      if (typeof u.location.distance === 'number' && u.location.distance > f.distanceKm) return false;
      if (f.showVerifiedOnly && !u.verified) return false;
      if (f.education && !(u.education ?? '').toLowerCase().includes(f.education.toLowerCase())) return false;
      if (f.heightRange) {
        const m = f.heightRange.match(/(\d+)\s*-\s*(\d+)/);
        if (m) {
          const min = parseInt(m[1], 10);
          const max = parseInt(m[2], 10);
          const h = u.heightCm ?? 0;
          if (h && (h < min || h > max)) return false;
        }
      }
      if (f.specificLocation && !(u.location.city ?? '').toLowerCase().includes(f.specificLocation.toLowerCase())) return false;
      return true;
    });
  };

  const refilterPotential = () => {
    setPotentialMatches(prev => applyFilters(prev, filters, swipeHistory, blockedIds));
  };

  const setCurrentProfile = useCallback(async (profile: User) => {
    const normalized: User = {
      ...profile,
      ownedThemes: profile.ownedThemes ?? [],
      profileTheme: (profile.profileTheme ?? null) as ThemeId | null,
    } as User;
    await AsyncStorage.setItem('user_profile', JSON.stringify(normalized));
    setCurrentProfileState(normalized);
    try {
      const payload = {
        id: normalized.id,
        name: normalized.name,
        age: normalized.age,
        gender: normalized.gender,
        interested_in: (normalized.interestedIn ?? null) as any,
        bio: normalized.bio,
        photos: normalized.photos,
        interests: normalized.interests,
        city: normalized.location.city,
        latitude: normalized.location.latitude ?? null,
        longitude: normalized.location.longitude ?? null,
        height_cm: normalized.heightCm ?? null,
        education: normalized.education ?? null,
        verified: normalized.verified ?? false,
        last_active: new Date().toISOString(),
        profile_theme: normalized.profileTheme ?? null,
        owned_themes: normalized.ownedThemes ?? [],
        profile_complete: Boolean(normalized.profileComplete ?? false),
      } as const;
      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      if (error) console.log('[App] profile upsert error', error.message);
    } catch (e) {
      console.log('[App] profile sync error', e);
    }
  }, []);

  const updateProfile = useCallback(async (patch: Partial<User>) => {
    setCurrentProfileState(prev => {
      const base = (prev as User) ?? ({} as User);
      const hasProfileTheme = Object.prototype.hasOwnProperty.call(patch, 'profileTheme');
      const hasOwnedThemes = Object.prototype.hasOwnProperty.call(patch, 'ownedThemes');
      const next: User = {
        ...base,
        ...patch,
        ownedThemes: (hasOwnedThemes ? (patch.ownedThemes as ThemeId[] | undefined) : base.ownedThemes) ?? [],
        profileTheme: (hasProfileTheme ? (patch.profileTheme as ThemeId | null | undefined) : base.profileTheme) ?? null,
      } as User;
      AsyncStorage.setItem('user_profile', JSON.stringify(next));
      (async () => {
        try {
          const payload = {
            id: next.id,
            name: next.name,
            age: next.age,
            gender: next.gender,
            interested_in: (next.interestedIn ?? null) as any,
            bio: next.bio,
            photos: next.photos,
            interests: next.interests,
            city: next.location.city,
            latitude: next.location.latitude ?? null,
            longitude: next.location.longitude ?? null,
            height_cm: next.heightCm ?? null,
            education: next.education ?? null,
            verified: next.verified ?? false,
            last_active: new Date().toISOString(),
            profile_theme: next.profileTheme ?? null,
            owned_themes: next.ownedThemes ?? [],
            profile_complete: Boolean(next.profileComplete ?? false),
          } as const;
          const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
          if (error) console.log('[App] profile update error', error.message);
        } catch (e) {
          console.log('[App] profile update sync failed', e);
        }
      })();
      return next;
    });
  }, []);

  const setFilters = useCallback(async (next: FiltersState) => {
    await AsyncStorage.setItem('filters_state', JSON.stringify(next));
    setFiltersState(next);
  }, []);

  const blockUser = useCallback(async (userId: string) => {
    setBlockedIds(prev => {
      const next = Array.from(new Set([...prev, userId]));
      AsyncStorage.setItem('blocked_ids', JSON.stringify(next));
      return next;
    });
    setPotentialMatches(prev => prev.filter(u => u.id !== userId));
  }, []);

  const swipeUser = useCallback((userId: string, action: 'like' | 'nope' | 'superlike') => {
    const swipe: SwipeAction = {
      userId,
      action,
      timestamp: new Date(),
    };

    const newHistory = [...swipeHistory, swipe];
    setSwipeHistory(newHistory);
    AsyncStorage.setItem('swipe_history', JSON.stringify(newHistory));

    setPotentialMatches(prev => prev.filter(u => u.id !== userId));

    if (action === 'like' || action === 'superlike') {
      sendPushToUser(userId, {
        title: 'New like',
        body: 'Someone liked your profile. Open the app to check!',
      }).catch(e => console.log('[Push] like notify failed', e));
      (async () => {
        try {
          const { data: u } = await supabase.auth.getUser();
          const myId = u?.user?.id ?? (currentProfile?.id ?? null);
          if (!myId) return;
          await supabase.from('likes').insert({ liker_id: myId, liked_id: userId, type: action });
          const { data: reciprocal } = await supabase
            .from('likes')
            .select('id')
            .eq('liker_id', userId)
            .eq('liked_id', myId)
            .maybeSingle();
          if (reciprocal) {
            await supabase.from('matches').insert({ user1_id: myId, user2_id: userId, matched_at: new Date().toISOString() });
          }
        } catch (e) {
          console.log('[App] swipe sync failed', e);
        }
      })();
    }
  }, [swipeHistory, currentProfile?.id]);

  const setTier = useCallback(async (next: MembershipTier) => {
    await AsyncStorage.setItem('tier', JSON.stringify(next));
    setTierState(next);
  }, []);

  const addCredits = useCallback(async (n: number) => {
    setCredits(prev => {
      const next = prev + n;
      AsyncStorage.setItem('credits', JSON.stringify(next));
      return next;
    });
  }, []);

  const unlockTheme = useCallback(async (theme: ThemeId) => {
    setCurrentProfileState(prev => {
      try {
        const owned = new Set([...(prev?.ownedThemes ?? [])]);
        owned.add(theme);
        let base: User;
        if (!prev) {
          const fallbackId = Math.random().toString(36).slice(2);
          base = {
            id: fallbackId,
            name: 'Me',
            age: 18,
            gender: 'boy',
            bio: '',
            photos: [],
            interests: [],
            location: { city: '' },
            verified: false,
            ownedThemes: [],
            profileTheme: null,
          } as User;
        } else {
          base = prev as User;
        }
        const next: User = { ...base, ownedThemes: Array.from(owned) } as User;
        AsyncStorage.setItem('user_profile', JSON.stringify(next));
        (async () => {
          try {
            await supabase.from('profiles').upsert({
              id: next.id,
              name: next.name,
              age: next.age,
              gender: next.gender,
              bio: next.bio,
              photos: next.photos,
              interests: next.interests,
              city: next.location.city,
              latitude: next.location.latitude ?? null,
              longitude: next.location.longitude ?? null,
              height_cm: next.heightCm ?? null,
              education: next.education ?? null,
              verified: next.verified ?? false,
              last_active: new Date().toISOString(),
              profile_theme: next.profileTheme ?? null,
              owned_themes: next.ownedThemes ?? [],
              profile_complete: Boolean(next.profileComplete ?? false),
            }, { onConflict: 'id' });
          } catch {}
        })();
        return next;
      } catch (e) {
        console.log('[App] unlockTheme failed', e);
        return prev ?? null;
      }
    });
  }, []);

  const setProfileThemeFn = useCallback(async (theme: ThemeId | null) => {
    setCurrentProfileState(prev => {
      if (!prev) return prev as any;
      const next: User = { ...(prev as User), profileTheme: theme } as User;
      AsyncStorage.setItem('user_profile', JSON.stringify(next));
      (async () => {
        try {
          await supabase.from('profiles').update({ profile_theme: theme }).eq('id', (prev as User).id);
        } catch {}
      })();
      return next;
    });
  }, []);

  return useMemo(() => ({
    currentProfile,
    potentialMatches,
    matches,
    swipeHistory,
    tier,
    credits,
    filters,
    setFilters,
    setCurrentProfile,
    updateProfile,
    swipeUser,
    setTier,
    addCredits,
    blockUser,
    blockedIds,
    unlockTheme,
    setProfileTheme: setProfileThemeFn,
  }), [currentProfile, potentialMatches, matches, swipeHistory, tier, credits, filters, setFilters, setCurrentProfile, updateProfile, swipeUser, setTier, addCredits, blockUser, blockedIds, unlockTheme, setProfileThemeFn]);
});