import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { User, Match, SwipeAction, MembershipTier, ThemeId } from '@/types';
import { mockUsers } from '@/mocks/users';
import { mockMatches } from '@/mocks/matches';
import { sendPushToUser } from '@/lib/notifications';

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
  const [matches, setMatches] = useState<Match[]>(mockMatches);
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
      if (storedFilters) setFiltersState(JSON.parse(storedFilters));
      if (storedBlocked) setBlockedIds(JSON.parse(storedBlocked));
      setPotentialMatches(applyFilters(mockUsers, filters, [], JSON.parse(storedBlocked ?? '[]')));
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
      if (u.age < f.ageMin || u.age > f.ageMax) return false;
      if (typeof u.location.distance === 'number' && u.location.distance > f.distanceKm) return false;
      if (f.showVerifiedOnly && !u.verified) return false;
      return true;
    });
  };

  const refilterPotential = () => {
    const filtered = applyFilters(mockUsers, filters, swipeHistory, blockedIds);
    setPotentialMatches(filtered);
  };

  const setCurrentProfile = useCallback(async (profile: User) => {
    const normalized: User = {
      ...profile,
      ownedThemes: profile.ownedThemes ?? [],
      profileTheme: (profile.profileTheme ?? null) as ThemeId | null,
    } as User;
    await AsyncStorage.setItem('user_profile', JSON.stringify(normalized));
    setCurrentProfileState(normalized);
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
      // Notify the other user about a new like
      sendPushToUser(userId, {
        title: 'New like',
        body: 'Someone liked your profile. Open the app to check!',
      }).catch(e => console.log('[Push] like notify failed', e));

      if (Math.random() > 0.5) {
        const user = mockUsers.find(u => u.id === userId);
        if (user) {
          const newMatch: Match = {
            id: `m${Date.now()}`,
            user,
            matchedAt: new Date(),
            hasNewMessage: false,
          };
          setMatches(prev => [newMatch, ...prev]);
          // Notify both users about a new match
          sendPushToUser(userId, { title: 'It’s a match!', body: `You matched with ${user.name}! 🎉` }).catch(() => {});
        }
      }
    }
  }, [swipeHistory]);

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
      const owned = new Set([...(prev?.ownedThemes ?? [])]);
      owned.add(theme);
      const next: User = { ...(prev as User), ownedThemes: Array.from(owned) } as User;
      AsyncStorage.setItem('user_profile', JSON.stringify(next));
      return next;
    });
  }, []);

  const setProfileThemeFn = useCallback(async (theme: ThemeId | null) => {
    setCurrentProfileState(prev => {
      const next: User = { ...(prev as User), profileTheme: theme } as User;
      AsyncStorage.setItem('user_profile', JSON.stringify(next));
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