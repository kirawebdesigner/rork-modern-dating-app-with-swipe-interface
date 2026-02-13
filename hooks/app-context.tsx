import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { User, Match, SwipeAction, MembershipTier, ThemeId } from '@/types';
import { sendPushToUser } from '@/lib/notifications';
import { supabase, TEST_MODE } from '@/lib/supabase';

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
  const [allProfiles, setAllProfiles] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [swipeHistory, setSwipeHistory] = useState<SwipeAction[]>([]);
  const [tier, setTierState] = useState<MembershipTier>('free');
  const [credits, setCredits] = useState<number>(0);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [filters, setFiltersState] = useState<FiltersState>({
    interestedIn: 'girl',
    locationLabel: 'Ethiopia',
    distanceKm: 50,
    ageMin: 18,
    ageMax: 60,
    latitude: undefined,
    longitude: undefined,
    showVerifiedOnly: false,
  });

  const normalizeProfile = useCallback((p: User | null): User | null => {
    if (!p) return null;
    const ownedThemes: ThemeId[] = Array.isArray(p.ownedThemes) ? (p.ownedThemes as ThemeId[]) : [];
    const profileTheme: ThemeId | null = (p.profileTheme ?? null) as ThemeId | null;
    return { ...p, ownedThemes, profileTheme } as User;
  }, []);

  const computeCompleted = useCallback((u: User): boolean => {
    try {
      const hasName = typeof u.name === 'string' && u.name.trim().length > 0;
      const hasAge = typeof u.age === 'number' && u.age >= 18;
      const hasGender = u.gender === 'boy' || u.gender === 'girl';
      const hasPhoto = Array.isArray(u.photos) && u.photos.length > 0;
      const hasBio = typeof u.bio === 'string' && u.bio.trim().length > 0;
      return Boolean(hasName && hasAge && hasGender && hasPhoto && hasBio);
    } catch {
      return false;
    }
  }, []);

  const applyFilters = useCallback((users: User[], f: FiltersState, swiped: SwipeAction[], blocked: string[]) => {
    console.log('[App] applyFilters called with', users.length, 'users');
    const swipedIds = new Set(swiped.map(s => s.userId));
    const blockedSet = new Set(blocked);
    const filtered = users.filter(u => {
      if (swipedIds.has(u.id)) {
        console.log('[App] Filtering out swiped user:', u.id);
        return false;
      }
      if (blockedSet.has(u.id)) {
        console.log('[App] Filtering out blocked user:', u.id);
        return false;
      }
      if (currentProfile?.id && u.id === currentProfile.id) {
        console.log('[App] Filtering out current user:', u.id);
        return false;
      }
      if (f.interestedIn === 'girl' && u.gender !== 'girl') {
        console.log('[App] Filtering out user (gender mismatch):', u.id, u.gender);
        return false;
      }
      if (f.interestedIn === 'boy' && u.gender !== 'boy') {
        console.log('[App] Filtering out user (gender mismatch):', u.id, u.gender);
        return false;
      }
      if (currentProfile?.gender && u.interestedIn && u.interestedIn !== currentProfile.gender) {
        console.log('[App] Filtering out user (interested_in mismatch):', u.id, u.interestedIn, 'vs', currentProfile.gender);
        return false;
      }
      if (u.age && (u.age < f.ageMin || u.age > f.ageMax)) {
        console.log('[App] Filtering out user (age):', u.id, u.age);
        return false;
      }
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
    console.log('[App] Filtered to', filtered.length, 'users');
    return filtered;
  }, [currentProfile]);

  const refilterPotential = useCallback(() => {
    setPotentialMatches(applyFilters(allProfiles, filters, swipeHistory, blockedIds));
  }, [allProfiles, filters, swipeHistory, blockedIds, applyFilters]);

  const loadAppData = useCallback(async () => {
    try {
      console.log('[App] loadAppData starting...');
      const [profile, storedTier, storedCredits, history, storedFilters, storedBlocked, storedPhone, storedId] = await Promise.all([
        AsyncStorage.getItem('user_profile'),
        AsyncStorage.getItem('tier'),
        AsyncStorage.getItem('credits'),
        AsyncStorage.getItem('swipe_history'),
        AsyncStorage.getItem('filters_state'),
        AsyncStorage.getItem('blocked_ids'),
        AsyncStorage.getItem('user_phone'),
        AsyncStorage.getItem('user_id'),
      ]);

      let myUserId: string | null = storedId;
      let localHistory = history ? JSON.parse(history) : [];

      if (profile) {
        const parsedProfile = normalizeProfile(JSON.parse(profile));
        if (parsedProfile) {
          console.log('[App] Loaded profile from AsyncStorage:', parsedProfile.id);
          setCurrentProfileState(parsedProfile);
          myUserId = parsedProfile.id;
        }
      } else if (storedId || storedPhone) {
        console.log('[App] No cached profile, fetching from Supabase...');
        let freshProfile: any = null;
        let freshError: any = null;
        try {
          const result = await supabase
            .from('profiles')
            .select('*')
            .eq(storedId ? 'id' : 'phone', storedId ?? storedPhone)
            .maybeSingle();
          freshProfile = result.data;
          freshError = result.error;
        } catch (fetchErr: any) {
          console.log('[App] Network error fetching profile:', fetchErr?.message);
        }
        const error = freshError;
        
        if (!error && freshProfile) {
          const mappedProfile: User = {
            id: String(freshProfile.id),
            name: String(freshProfile.name ?? 'User'),
            age: Number(freshProfile.age ?? 0),
            birthday: freshProfile.birthday ? new Date(String(freshProfile.birthday)) : undefined,
            gender: (freshProfile.gender as 'boy' | 'girl') ?? 'boy',
            interestedIn: (freshProfile.interested_in as 'boy' | 'girl' | null) ?? undefined,
            bio: String(freshProfile.bio ?? ''),
            photos: Array.isArray(freshProfile.photos) ? (freshProfile.photos as string[]) : [],
            interests: Array.isArray(freshProfile.interests) ? (freshProfile.interests as string[]) : [],
            location: { 
              city: String(freshProfile.city ?? ''), 
              latitude: freshProfile.latitude ? Number(freshProfile.latitude) : undefined, 
              longitude: freshProfile.longitude ? Number(freshProfile.longitude) : undefined 
            },
            heightCm: typeof freshProfile.height_cm === 'number' ? Number(freshProfile.height_cm) : undefined,
            education: freshProfile.education ? String(freshProfile.education) : undefined,
            verified: Boolean(freshProfile.verified),
            lastActive: freshProfile.last_active ? new Date(String(freshProfile.last_active)) : undefined,
            ownedThemes: Array.isArray(freshProfile.owned_themes) ? (freshProfile.owned_themes as ThemeId[]) : [],
            profileTheme: (freshProfile.profile_theme as ThemeId | null) ?? null,
            completed: Boolean(freshProfile.completed),
          } as User;
          
          console.log('[App] Fetched and cached profile from Supabase:', mappedProfile.id);
          setCurrentProfileState(mappedProfile);
          myUserId = mappedProfile.id;
          await AsyncStorage.setItem('user_profile', JSON.stringify(mappedProfile));
        }
      }
      if (storedTier) setTierState(JSON.parse(storedTier));
      if (storedCredits) setCredits(JSON.parse(storedCredits));
      if (storedBlocked) setBlockedIds(JSON.parse(storedBlocked));

      // Load swipe history from database to prevent showing already swiped profiles
      if (!TEST_MODE && myUserId) {
        try {
          console.log('[App] Loading swipe history from database for user:', myUserId);
          let dbSwipes: any[] | null = null;
          let swipeErr: any = null;
          try {
            const swipeResult = await supabase
              .from('swipes')
              .select('swiped_id, action, created_at')
              .eq('swiper_id', myUserId);
            dbSwipes = swipeResult.data;
            swipeErr = swipeResult.error;
          } catch (fetchErr: any) {
            console.log('[App] Network error loading swipes:', fetchErr?.message);
          }
          
          if (!swipeErr && dbSwipes && dbSwipes.length > 0) {
            const dbHistory: SwipeAction[] = dbSwipes.map((s: any) => ({
              userId: String(s.swiped_id),
              action: s.action as 'like' | 'nope' | 'superlike',
              timestamp: new Date(s.created_at),
            }));
            
            // Merge with local history (db takes precedence)
            const mergedIds = new Set(dbHistory.map(h => h.userId));
            const mergedHistory = [
              ...dbHistory,
              ...localHistory.filter((h: SwipeAction) => !mergedIds.has(h.userId)),
            ];
            
            console.log('[App] Loaded', dbHistory.length, 'swipes from database, merged total:', mergedHistory.length);
            setSwipeHistory(mergedHistory);
            await AsyncStorage.setItem('swipe_history', JSON.stringify(mergedHistory));
            localHistory = mergedHistory;
          } else {
            console.log('[App] No swipes in database, using local history');
            if (history) setSwipeHistory(JSON.parse(history));
          }
        } catch (swipeLoadErr) {
          console.log('[App] Failed to load swipes from database:', swipeLoadErr);
          if (history) setSwipeHistory(JSON.parse(history));
        }
      } else {
        if (history) setSwipeHistory(JSON.parse(history));
      }

      try {
        let uid: string | null = null;
        try {
          const authResult = await supabase.auth.getUser();
          uid = authResult?.data?.user?.id ?? null;
        } catch (authErr: any) {
          console.log('[App] Network error getting auth user:', authErr?.message);
        }
        if (!profile && uid) {
          let me: any = null;
          let meErr: any = null;
          try {
            const meResult = await supabase
              .from('profiles')
              .select('id,name,age,gender,interested_in,bio,photos,interests,city,latitude,longitude,height_cm,education,verified,last_active,profile_theme,owned_themes,completed')
              .eq('id', uid)
              .maybeSingle();
            me = meResult.data;
            meErr = meResult.error;
          } catch (meFetchErr: any) {
            console.log('[App] Network error fetching self profile:', meFetchErr?.message);
          }
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
              completed: Boolean((me as any).completed),
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

      const userPhone = await AsyncStorage.getItem('user_phone');
      console.log('[App] Loading profiles, current user phone:', userPhone);
      
      if (TEST_MODE) {
        console.log('[App] TEST MODE: Using mock profiles');
        const mockProfiles: User[] = [
          {
            id: 'mock1',
            name: 'Hanna',
            age: 24,
            gender: 'girl',
            interestedIn: 'boy',
            bio: 'Love hiking and coffee ☕',
            photos: ['https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=640'],
            interests: ['Coffee', 'Hiking', 'Photography'],
            location: { city: 'Addis Ababa' },
            verified: true,
            ownedThemes: [],
            profileTheme: null,
            completed: true,
          },
          {
            id: 'mock2',
            name: 'Meron',
            age: 26,
            gender: 'girl',
            interestedIn: 'boy',
            bio: 'Artist and traveler 🎨✈️',
            photos: ['https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=640'],
            interests: ['Art', 'Travel', 'Music'],
            location: { city: 'Dire Dawa' },
            verified: false,
            ownedThemes: [],
            profileTheme: null,
            completed: true,
          },
          {
            id: 'mock3',
            name: 'Daniel',
            age: 28,
            gender: 'boy',
            interestedIn: 'girl',
            bio: 'Tech enthusiast & gym lover 💪',
            photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=640'],
            interests: ['Technology', 'Fitness', 'Music'],
            location: { city: 'Addis Ababa' },
            verified: true,
            ownedThemes: [],
            profileTheme: null,
            completed: true,
          },
          {
            id: 'mock4',
            name: 'Selam',
            age: 23,
            gender: 'girl',
            interestedIn: 'boy',
            bio: 'Music lover and foodie 🎵🍕',
            photos: ['https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=640'],
            interests: ['Music', 'Food', 'Dancing'],
            location: { city: 'Hawassa' },
            verified: true,
            ownedThemes: [],
            profileTheme: null,
            completed: true,
          },
          {
            id: 'mock5',
            name: 'Yonas',
            age: 27,
            gender: 'boy',
            interestedIn: 'girl',
            bio: 'Entrepreneur & coffee addict ☕',
            photos: ['https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=640'],
            interests: ['Business', 'Coffee', 'Reading'],
            location: { city: 'Bahir Dar' },
            verified: false,
            ownedThemes: [],
            profileTheme: null,
            completed: true,
          },
          {
            id: 'mock6',
            name: 'Feven',
            age: 25,
            gender: 'girl',
            interestedIn: 'boy',
            bio: 'Nature lover & adventurer 🌿',
            photos: ['https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=640'],
            interests: ['Nature', 'Adventure', 'Yoga'],
            location: { city: 'Gondar' },
            verified: true,
            ownedThemes: [],
            profileTheme: null,
            completed: true,
          },
        ];
        
        const filteredMock = mockProfiles.filter(p => {
          if (currentProfile?.gender === 'girl' && p.gender === 'boy') return true;
          if (currentProfile?.gender === 'boy' && p.gender === 'girl') return true;
          if (!currentProfile) return true;
          return false;
        });
        
        setAllProfiles(filteredMock);
        const filtered = applyFilters(filteredMock, {
          ...filters,
          interestedIn: (storedFilters ? JSON.parse(storedFilters).interestedIn : (currentProfile ? ((currentProfile.interestedIn as InterestedIn | undefined) ?? (currentProfile.gender === 'girl' ? 'boy' : 'girl')) : filters.interestedIn)) as InterestedIn,
        }, JSON.parse(history ?? '[]'), JSON.parse(storedBlocked ?? '[]'));
        setPotentialMatches(filtered);
        return;
      }
      
      let profiles: any[] | null = null;
      let error: any = null;
      try {
        const profilesResult = await supabase
          .from('profiles')
          .select('id,phone,name,age,birthday,gender,interested_in,bio,photos,interests,city,latitude,longitude,height_cm,education,verified,last_active,profile_theme,owned_themes,completed')
          .eq('completed', true)
          .limit(100);
        profiles = profilesResult.data;
        error = profilesResult.error;
      } catch (fetchErr: any) {
        console.log('[App] Network error loading profiles:', fetchErr?.message);
        error = { message: fetchErr?.message ?? 'Network unavailable' };
      }
      if (error) {
        console.log('[App] load profiles error', error.message);
        console.log('[App] Falling back to empty profile list');
        setPotentialMatches([]);
        setAllProfiles([]);
      } else {
        const mapped: User[] = (profiles as any[])
          .filter((row) => {
            if (userPhone && row.phone === userPhone) {
              console.log('[App] Filtering out current user:', row.phone);
              return false;
            }
            if (!row.completed) {
              console.log('[App] Filtering out incomplete profile:', row.phone);
              return false;
            }
            return true;
          })
          .map((row) => ({
            id: String(row.id),
            name: String(row.name ?? 'User'),
            age: Number(row.age ?? 0),
            birthday: row.birthday ? new Date(String(row.birthday)) : undefined,
            gender: (row.gender as 'boy' | 'girl') ?? 'boy',
            interestedIn: (row.interested_in as 'boy' | 'girl' | null) ?? undefined,
            bio: String(row.bio ?? ''),
            photos: Array.isArray(row.photos) && row.photos.length > 0 ? (row.photos as string[]) : ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=640&auto=format&fit=crop'],
            interests: Array.isArray(row.interests) ? (row.interests as string[]) : [],
            location: { city: String(row.city ?? ''), latitude: row.latitude ? Number(row.latitude) : undefined, longitude: row.longitude ? Number(row.longitude) : undefined },
            heightCm: typeof row.height_cm === 'number' ? Number(row.height_cm) : undefined,
            education: row.education ? String(row.education) : undefined,
            verified: Boolean(row.verified),
            lastActive: row.last_active ? new Date(String(row.last_active)) : undefined,
            ownedThemes: Array.isArray(row.owned_themes) ? (row.owned_themes as ThemeId[]) : [],
            profileTheme: (row.profile_theme as ThemeId | null) ?? null,
            completed: Boolean((row as any).completed),
          } as User));
        if (storedFilters) {
          setFiltersState(JSON.parse(storedFilters));
        } else if (currentProfile) {
          const defaultInterestedIn: InterestedIn = ((currentProfile.interestedIn as InterestedIn | undefined) ?? (currentProfile.gender === 'girl' ? 'boy' : 'girl'));
          setFiltersState(prev => ({ ...prev, interestedIn: defaultInterestedIn }));
        }
        setAllProfiles(mapped);
        const filtered = applyFilters(mapped, {
          ...filters,
          interestedIn: (storedFilters ? JSON.parse(storedFilters).interestedIn : (currentProfile ? ((currentProfile.interestedIn as InterestedIn | undefined) ?? (currentProfile.gender === 'girl' ? 'boy' : 'girl')) : filters.interestedIn)) as InterestedIn,
        }, JSON.parse(history ?? '[]'), JSON.parse(storedBlocked ?? '[]'));
        setPotentialMatches(filtered);
      }

      try {
        if (TEST_MODE) {
          console.log('[App] TEST MODE: Skipping matches load');
          return;
        }
        
        if (userPhone) {
          let myProfile: any = null;
          try {
            const myProfileResult = await supabase
              .from('profiles')
              .select('id')
              .eq('phone', userPhone)
              .maybeSingle();
            myProfile = myProfileResult.data;
          } catch (e: any) {
            console.log('[App] Network error fetching my profile for matches:', e?.message);
          }
          
          const myId = myProfile?.id ?? null;
          if (myId) {
            let matchesRows: any[] | null = null;
            try {
              const matchResult = await supabase
                .from('matches')
                .select('id, user1_id, user2_id, matched_at')
                .or(`user1_id.eq.${myId},user2_id.eq.${myId}`);
              matchesRows = matchResult.data;
            } catch (e: any) {
              console.log('[App] Network error loading matches:', e?.message);
            }
            
            if (matchesRows && matchesRows.length > 0) {
              console.log('[App] loading matches:', matchesRows.length);
              const matchesWithUsers = await Promise.all(
                matchesRows.map(async (m: any) => {
                  try {
                    const otherId = m.user1_id === myId ? m.user2_id : m.user1_id;
                    const { data: otherUser } = await supabase
                      .from('profiles')
                      .select('id,name,age,gender,bio,photos,interests,city')
                      .eq('id', otherId)
                      .maybeSingle();
                    
                    if (!otherUser) return null;
                    
                    return {
                      id: String(m.id),
                      user: {
                        id: String(otherUser.id),
                        name: String(otherUser.name ?? 'User'),
                        age: Number(otherUser.age ?? 0),
                        gender: (otherUser.gender as 'boy' | 'girl') ?? 'boy',
                        bio: String(otherUser.bio ?? ''),
                        photos: Array.isArray(otherUser.photos) && otherUser.photos.length > 0 ? (otherUser.photos as string[]) : ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=640&auto=format&fit=crop'],
                        interests: Array.isArray(otherUser.interests) ? (otherUser.interests as string[]) : [],
                        location: { city: String(otherUser.city ?? '') },
                      },
                      matchedAt: new Date(String(m.matched_at)),
                    } as Match;
                  } catch (e: any) {
                    console.log('[App] Network error loading match user:', e?.message);
                    return null;
                  }
                })
              );
              
              const validMatches = matchesWithUsers.filter((m): m is Match => m !== null);
              setMatches(validMatches);
              console.log('[App] loaded matches with user data:', validMatches.length);
            }
          }
        }
      } catch (matchLoadErr: any) {
        console.log('[App] load matches failed', matchLoadErr?.message);
      }
    } catch (error) {
      console.error('Error loading app data:', error);
    }
  }, [currentProfile, filters, normalizeProfile, applyFilters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAppData().catch(e => console.error('[App] loadAppData failed:', e));
    }, 100);
    return () => clearTimeout(timer);
  }, [loadAppData]);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;

    const checkAndReload = async () => {
      if (retryCount >= maxRetries) return;
      try {
        const storedPhone = await AsyncStorage.getItem('user_phone');
        const storedProfile = await AsyncStorage.getItem('user_profile');
        
        if (storedPhone && !storedProfile) {
          console.log('[App] User logged in but no profile in cache, reloading...');
          retryCount++;
          await loadAppData();
        } else if (storedPhone && (!currentProfile || currentProfile.id === '')) {
          console.log('[App] User logged in but profile state not set, reloading...');
          retryCount++;
          await loadAppData();
        }
      } catch (e) {
        console.log('[App] checkAndReload failed:', e);
      }
    };
    
    const interval = setInterval(checkAndReload, 5000);
    checkAndReload();
    
    return () => clearInterval(interval);
  }, [currentProfile, loadAppData]);

  useEffect(() => {
    refilterPotential();
  }, [refilterPotential]);

  const setCurrentProfile = useCallback(async (profile: User) => {
    const normalized: User = {
      ...profile,
      ownedThemes: profile.ownedThemes ?? [],
      profileTheme: (profile.profileTheme ?? null) as ThemeId | null,
      completed: computeCompleted(profile),
    } as User;
    await AsyncStorage.setItem('user_profile', JSON.stringify(normalized));
    setCurrentProfileState(normalized);
    
    if (TEST_MODE) {
      console.log('[App] TEST MODE: Profile saved locally only');
      return;
    }
    
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
        completed: computeCompleted(normalized),
      } as const;
      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      if (error) console.log('[App] profile upsert error', error.message);
    } catch (e) {
      console.log('[App] profile sync error', e);
    }
  }, [computeCompleted]);

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
      (next as any).completed = computeCompleted(next);
      AsyncStorage.setItem('user_profile', JSON.stringify(next));
      
      if (TEST_MODE) {
        console.log('[App] TEST MODE: Profile update saved locally only');
        return next;
      }
      
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
            completed: computeCompleted(next),
          } as const;
          const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
          if (error) console.log('[App] profile update error', error.message);
        } catch (e) {
          console.log('[App] profile update sync failed', e);
        }
      })();
      return next;
    });
  }, [computeCompleted]);

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
      if (!TEST_MODE) {
        sendPushToUser(userId, {
          title: 'New like',
          body: 'Someone liked your profile. Open the app to check!',
        }).catch(e => console.log('[Push] like notify failed', e));
      }
      
      (async () => {
        if (TEST_MODE) {
          console.log('[App] TEST MODE: Skipping swipe sync to server');
          return;
        }
        
        try {
          const storedPhone = await AsyncStorage.getItem('user_phone');
          if (!storedPhone) {
            console.log('[App] swipe: no phone found');
            return;
          }
          
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('phone', storedPhone)
            .maybeSingle();
          
          const myId = myProfile?.id ?? currentProfile?.id ?? null;
          if (!myId) {
            console.log('[App] swipe: no user ID found');
            return;
          }
          console.log('[App] inserting swipe:', myId, '->', userId, action);
          const { error: swipeError } = await supabase.from('swipes').insert({ swiper_id: myId, swiped_id: userId, action });
          if (swipeError) {
            console.log('[App] swipe insert error:', swipeError.message);
            return;
          }
          console.log('[App] swipe inserted successfully');
          
          // Check for mutual like to create a match
          console.log('[App] Checking for mutual like...');
          const { data: mutualLike, error: mutualErr } = await supabase
            .from('swipes')
            .select('id')
            .eq('swiper_id', userId)
            .eq('swiped_id', myId)
            .in('action', ['like', 'superlike'])
            .maybeSingle();
          
          if (!mutualErr && mutualLike) {
            console.log('[App] Mutual like found! Creating match...');
            
            // Check if match already exists
            const { data: existingMatch } = await supabase
              .from('matches')
              .select('id')
              .or(`and(user1_id.eq.${myId},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${myId})`)
              .maybeSingle();
            
            if (!existingMatch) {
              // Create match with LEAST/GREATEST ordering to match database trigger
              const user1 = myId < userId ? myId : userId;
              const user2 = myId < userId ? userId : myId;
              
              const { data: newMatch, error: matchInsertErr } = await supabase
                .from('matches')
                .insert({
                  user1_id: user1,
                  user2_id: user2,
                  matched_at: new Date().toISOString(),
                })
                .select('id')
                .single();
              
              if (matchInsertErr) {
                console.log('[App] Failed to create match:', matchInsertErr.message);
                // Check if match was created by database trigger
                const { data: triggerMatch } = await supabase
                  .from('matches')
                  .select('id')
                  .or(`and(user1_id.eq.${user1},user2_id.eq.${user2}),and(user1_id.eq.${user2},user2_id.eq.${user1})`)
                  .maybeSingle();
                
                if (triggerMatch) {
                  console.log('[App] Match exists from trigger:', triggerMatch.id);
                  // Create conversation for existing match
                  const { data: existingConv } = await supabase
                    .from('conversations')
                    .select('id')
                    .eq('id', triggerMatch.id)
                    .maybeSingle();
                  
                  if (!existingConv) {
                    await supabase.from('conversations').insert({ id: triggerMatch.id, created_by: myId });
                    await supabase.from('conversation_participants').insert([
                      { conversation_id: triggerMatch.id, user_id: myId },
                      { conversation_id: triggerMatch.id, user_id: userId },
                    ]);
                    console.log('[App] Conversation created for trigger match:', triggerMatch.id);
                  }
                }
              } else {
                console.log('[App] Match created successfully:', newMatch?.id);
                
                // Create conversation for the match
                const matchId = newMatch?.id;
                if (matchId) {
                  const { error: convErr } = await supabase
                    .from('conversations')
                    .insert({ id: matchId, created_by: myId });
                  
                  if (!convErr) {
                    await supabase.from('conversation_participants').insert([
                      { conversation_id: matchId, user_id: myId },
                      { conversation_id: matchId, user_id: userId },
                    ]);
                    console.log('[App] Conversation created for match:', matchId);
                  }
                }
              }
            } else {
              console.log('[App] Match already exists:', existingMatch.id);
              // Ensure conversation exists for the match
              const { data: existingConv } = await supabase
                .from('conversations')
                .select('id')
                .eq('id', existingMatch.id)
                .maybeSingle();
              
              if (!existingConv) {
                await supabase.from('conversations').insert({ id: existingMatch.id, created_by: myId });
                await supabase.from('conversation_participants').insert([
                  { conversation_id: existingMatch.id, user_id: myId },
                  { conversation_id: existingMatch.id, user_id: userId },
                ]);
                console.log('[App] Conversation created for existing match:', existingMatch.id);
              }
            }
          } else {
            console.log('[App] No mutual like yet');
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const { data: newMatches, error: matchError } = await supabase
            .from('matches')
            .select('id, user1_id, user2_id, matched_at')
            .or(`user1_id.eq.${myId},user2_id.eq.${myId}`);
          
          if (!matchError && newMatches) {
            console.log('[App] loaded matches after swipe:', newMatches.length);
            const matchesWithUsers = await Promise.all(
              newMatches.map(async (m: any) => {
                const otherId = m.user1_id === myId ? m.user2_id : m.user1_id;
                const { data: otherUser } = await supabase
                  .from('profiles')
                  .select('id,name,age,gender,bio,photos,interests,city')
                  .eq('id', otherId)
                  .maybeSingle();
                
                if (!otherUser) return null;
                
                return {
                  id: String(m.id),
                  user: {
                    id: String(otherUser.id),
                    name: String(otherUser.name ?? 'User'),
                    age: Number(otherUser.age ?? 0),
                    gender: (otherUser.gender as 'boy' | 'girl') ?? 'boy',
                    bio: String(otherUser.bio ?? ''),
                    photos: Array.isArray(otherUser.photos) && otherUser.photos.length > 0 ? (otherUser.photos as string[]) : ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=640&auto=format&fit=crop'],
                    interests: Array.isArray(otherUser.interests) ? (otherUser.interests as string[]) : [],
                    location: { city: String(otherUser.city ?? '') },
                  },
                  matchedAt: new Date(String(m.matched_at)),
                } as Match;
              })
            );
            
            const validMatches = matchesWithUsers.filter((m): m is Match => m !== null);
            setMatches(validMatches);
            console.log('[App] updated matches state:', validMatches.length);
          }
        } catch (e) {
          console.log('[App] swipe sync failed', e);
        }
      })();
    }
    
    // Also record nope swipes to database to prevent showing them again
    if (action === 'nope') {
      (async () => {
        if (TEST_MODE) return;
        try {
          const storedPhone = await AsyncStorage.getItem('user_phone');
          if (!storedPhone) return;
          
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('phone', storedPhone)
            .maybeSingle();
          
          const myId = myProfile?.id ?? currentProfile?.id ?? null;
          if (!myId) return;
          
          await supabase.from('swipes').insert({ swiper_id: myId, swiped_id: userId, action: 'nope' });
        } catch (e) {
          console.log('[App] nope swipe sync failed', e);
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
        
        if (TEST_MODE) return next;
        
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
            completed: Boolean((next as any).completed ?? false),
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
      
      if (TEST_MODE) return next;
      
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