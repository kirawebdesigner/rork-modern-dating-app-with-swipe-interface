import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { User, Match, SwipeAction, MembershipTier, ThemeId } from '@/types';
import { sendPushToUser } from '@/lib/notifications';
import { supabase, TEST_MODE } from '@/lib/supabase';
import { uploadPhotos } from '@/lib/upload';
import { calculateDistance, DEFAULT_LOCATION } from '@/lib/geo';

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
  isLoadingProfiles: boolean;
  setFilters: (next: FiltersState) => Promise<void>;
  setCurrentProfile: (profile: User) => Promise<void>;
  updateProfile: (patch: Partial<User>) => Promise<void>;
  swipeUser: (userId: string, action: 'like' | 'nope' | 'superlike') => Promise<{ isMatch: boolean; matchId?: string } | void>;
  setTier: (tier: MembershipTier) => Promise<void>;
  addCredits: (n: number) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  blockedIds: string[];
  unlockTheme: (theme: ThemeId) => Promise<void>;
  setProfileTheme: (theme: ThemeId | null) => Promise<void>;
  refreshProfiles: () => Promise<void>;
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
  const dataLoadedRef = useRef(false);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState<boolean>(true);
  const currentProfileRef = useRef<User | null>(null);
  const filtersRef = useRef(filters);
  currentProfileRef.current = currentProfile;
  filtersRef.current = filters;

  const normalizeProfile = useCallback((p: any): User | null => {
    if (!p) return null;
    const ownedThemes: ThemeId[] = Array.isArray(p.ownedThemes || p.owned_themes) ? (p.ownedThemes || p.owned_themes) as ThemeId[] : [];
    const profileTheme: ThemeId | null = (p.profileTheme || p.profile_theme || null) as ThemeId | null;
    
    // Calculate distance if coordinates are available
    let distance: number | undefined = p.distance;
    const myLoc = currentProfileRef.current?.location;
    const uLoc = { 
      lat: p.latitude ?? p.location?.latitude, 
      lon: p.longitude ?? p.location?.longitude 
    };

    if (!distance && myLoc?.latitude && myLoc?.longitude && uLoc.lat && uLoc.lon) {
      distance = Math.round(calculateDistance(
        myLoc.latitude, 
        myLoc.longitude, 
        uLoc.lat, 
        uLoc.lon
      ) * 0.621371); // Convert to miles to match UI
    }

    return { 
      ...p,
      id: String(p.id),
      name: String(p.name ?? 'User'),
      age: Number(p.age ?? 0),
      gender: (p.gender as 'boy' | 'girl') ?? 'boy',
      photos: Array.isArray(p.photos) ? (p.photos as string[]) : [],
      interests: Array.isArray(p.interests) ? (p.interests as string[]) : [],
      location: {
        city: String(p.city ?? p.location?.city ?? ''),
        latitude: uLoc.lat,
        longitude: uLoc.lon,
        distance
      },
      ownedThemes, 
      profileTheme 
    } as User;
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

  const applyFilters = useCallback((users: User[], f: FiltersState, swiped: SwipeAction[], blocked: string[], myId?: string | null) => {
    console.log('[App] applyFilters called with', users.length, 'users, myId:', myId, 'filters:', JSON.stringify(f));
    const swipedIds = new Set(swiped.map(s => s.userId));
    const blockedSet = new Set(blocked);
    const myProfile = currentProfileRef.current;
    const effectiveMyId = myId ?? myProfile?.id;
    const filtered = users.filter(u => {
      if (swipedIds.has(u.id)) return false;
      if (blockedSet.has(u.id)) return false;
      if (effectiveMyId && u.id === effectiveMyId) return false;
      if (f.interestedIn === 'girl' && u.gender !== 'girl') return false;
      if (f.interestedIn === 'boy' && u.gender !== 'boy') return false;
      
      // Additional fallback for 'both' if added in future
      if (f.interestedIn && f.interestedIn !== 'girl' && f.interestedIn !== 'boy') {
        // Assume both or something else, skip gender filtering
      }

      if (u.age && u.age > 0 && (u.age < (f.ageMin ?? 18) || u.age > (f.ageMax ?? 100))) return false;
      if (typeof u.location.distance === 'number' && u.location.distance > f.distanceKm) return false;
      const locLabel = (f.locationLabel ?? '').trim().toLowerCase();
      if (locLabel && locLabel !== 'ethiopia' && locLabel !== '') {
        const userCity = (u.location.city ?? '').toLowerCase();
        if (userCity && !userCity.includes(locLabel) && !locLabel.includes(userCity)) {
          return false;
        }
      }
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
    console.log('[App] Filtered to', filtered.length, 'users from', users.length, 'total');
    return filtered;
  }, []);

  const refilterPotential = useCallback(() => {
    const myId = currentProfileRef.current?.id ?? null;
    console.log('[App] refilterPotential: allProfiles=', allProfiles.length, 'swipeHistory=', swipeHistory.length, 'blocked=', blockedIds.length);
    const result = applyFilters(allProfiles, filters, swipeHistory, blockedIds, myId);
    setPotentialMatches(result);
  }, [allProfiles, filters, swipeHistory, blockedIds, applyFilters]);

  const loadAppData = useCallback(async () => {
    if (dataLoadedRef.current) {
      console.log('[App] loadAppData already loaded, skipping');
      return;
    }
    dataLoadedRef.current = true;
    setIsLoadingProfiles(true);
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
      let resolvedInterestedIn: InterestedIn | null = null;

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

      // Load blocked IDs from database
      if (!TEST_MODE && myUserId) {
        try {
          const { data: dbBlocks } = await supabase
            .from('blocks')
            .select('blocked_id')
            .eq('blocker_id', myUserId);
          
          if (dbBlocks && dbBlocks.length > 0) {
            const dbBlockedIds = dbBlocks.map(b => String(b.blocked_id));
            setBlockedIds(prev => {
              const merged = Array.from(new Set([...prev, ...dbBlockedIds]));
              AsyncStorage.setItem('blocked_ids', JSON.stringify(merged));
              return merged;
            });
            console.log('[App] Loaded', dbBlockedIds.length, 'blocked users from database');
          }
        } catch (e) {
          console.log('[App] Error loading blocks from DB', e);
        }
      }

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
              const defaultInterestedIn: InterestedIn = (mappedMe.interestedIn as InterestedIn | undefined) ?? (mappedMe.gender === 'girl' ? 'boy' : 'girl');
              resolvedInterestedIn = defaultInterestedIn;
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

        const cp = currentProfileRef.current;
        const mockInterestedIn: InterestedIn = storedFilters
          ? JSON.parse(storedFilters).interestedIn
          : (cp?.interestedIn as InterestedIn | undefined) ?? (cp?.gender === 'girl' ? 'boy' : 'girl');

        const filteredMock = mockProfiles.filter(p => {
          if (cp?.id && p.id === cp.id) return false;
          if (mockInterestedIn === 'girl' && p.gender === 'girl') return true;
          if (mockInterestedIn === 'boy' && p.gender === 'boy') return true;
          if (!cp) return true;
          return false;
        });

        setAllProfiles(filteredMock);
        const filtered = applyFilters(filteredMock, {
          ...filters,
          interestedIn: mockInterestedIn,
        }, JSON.parse(history ?? '[]'), JSON.parse(storedBlocked ?? '[]'), myUserId);
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
          .limit(500);
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
            if (userPhone && row.phone === userPhone) return false;
            if (!row.completed) return false;
            return true;
          })
          .map((row) => normalizeProfile(row))
          .filter((u): u is User => u !== null);

        let effectiveInterestedIn: InterestedIn = filters.interestedIn;
        if (storedFilters) {
          const parsedFilters = JSON.parse(storedFilters);
          setFiltersState(parsedFilters);
          effectiveInterestedIn = parsedFilters.interestedIn;
        } else {
          const cp = currentProfileRef.current;
          if (cp) {
            const defaultInterestedIn: InterestedIn = ((cp.interestedIn as InterestedIn | undefined) ?? (cp.gender === 'girl' ? 'boy' : 'girl'));
            effectiveInterestedIn = defaultInterestedIn;
            setFiltersState(prev => ({ ...prev, interestedIn: defaultInterestedIn }));
          } else if (resolvedInterestedIn) {
            effectiveInterestedIn = resolvedInterestedIn;
          }
        }
        setAllProfiles(mapped);
        const filtered = applyFilters(mapped, {
          ...filters,
          interestedIn: effectiveInterestedIn,
        }, localHistory, JSON.parse(storedBlocked ?? '[]'), myUserId);
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
              
              // Batch load all matched user profiles in a single query (fixes N+1)
              const otherUserIds = matchesRows.map((m: any) => 
                m.user1_id === myId ? m.user2_id : m.user1_id
              );
              
              let profilesMap = new Map<string, any>();
              try {
                const { data: profiles } = await supabase
                  .from('profiles')
                  .select('id,name,age,gender,bio,photos,interests,city')
                  .in('id', otherUserIds);
                if (profiles) {
                  profiles.forEach((p: any) => profilesMap.set(p.id, p));
                }
              } catch (e: any) {
                console.log('[App] Batch profile fetch error:', e?.message);
              }

              const matchesWithUsers = matchesRows.map((m: any) => {
                const otherId = m.user1_id === myId ? m.user2_id : m.user1_id;
                const otherUser = profilesMap.get(otherId);
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
              });

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
      dataLoadedRef.current = false;
    } finally {
      setIsLoadingProfiles(false);
    }
  }, [normalizeProfile, applyFilters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAppData().catch(e => console.error('[App] loadAppData failed:', e));
    }, 100);
    return () => clearTimeout(timer);
  }, [loadAppData]);

  const reloadData = useCallback(() => {
    console.log('[App] reloadData called, resetting dataLoaded flag');
    dataLoadedRef.current = false;
    loadAppData().catch(e => console.error('[App] reloadData failed:', e));
  }, [loadAppData]);

  const refreshProfiles = useCallback(async () => {
    console.log('[App] refreshProfiles called');
    dataLoadedRef.current = false;
    try {
      await loadAppData();
    } catch (e) {
      console.error('[App] refreshProfiles failed:', e);
    }
  }, [loadAppData]);

  useEffect(() => {
    if (currentProfile?.completed && potentialMatches.length === 0 && allProfiles.length === 0 && !isLoadingProfiles) {
      console.log('[App] Profile completed but no profiles loaded, triggering reload');
      dataLoadedRef.current = false;
      loadAppData().catch(e => console.error('[App] auto-reload failed:', e));
    }
  }, [currentProfile?.completed, isLoadingProfiles]);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    let stopped = false;

    const checkAndReload = async () => {
      if (stopped || retryCount >= maxRetries) return;
      if (dataLoadedRef.current && currentProfileRef.current?.id) return;
      try {
        const storedPhone = await AsyncStorage.getItem('user_phone');
        const storedProfile = await AsyncStorage.getItem('user_profile');

        if (storedPhone && !storedProfile) {
          console.log('[App] User logged in but no profile in cache, reloading...');
          retryCount++;
          dataLoadedRef.current = false;
          await loadAppData();
        } else if (storedPhone && (!currentProfileRef.current || currentProfileRef.current.id === '')) {
          console.log('[App] User logged in but profile state not set, reloading...');
          retryCount++;
          dataLoadedRef.current = false;
          await loadAppData();
        }
      } catch (e) {
        console.log('[App] checkAndReload failed:', e);
      }
    };

    const interval = setInterval(checkAndReload, 5000);
    checkAndReload();

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [loadAppData]);

  useEffect(() => {
    if (allProfiles.length > 0) {
      refilterPotential();
    }
  }, [refilterPotential, allProfiles.length]);

  const setCurrentProfile = useCallback(async (profile: User) => {
    // 1. Local state update
    const normalized: User = {
      ...profile,
      ownedThemes: profile.ownedThemes ?? [],
      profileTheme: (profile.profileTheme ?? null) as ThemeId | null,
    } as User;
    
    (normalized as any).completed = computeCompleted(normalized);
    
    await AsyncStorage.setItem('user_profile', JSON.stringify(normalized));
    setCurrentProfileState(normalized);

    if (TEST_MODE) {
      console.log('[App] TEST MODE: Profile saved locally only');
      return;
    }

    // 2. Server sync
    try {
      let finalPhotos = [...normalized.photos];
      if (normalized.id && normalized.photos.some(p => p.startsWith('file://'))) {
        console.log('[App] Local photos detected, uploading...');
        const uploaded = await uploadPhotos(normalized.photos, normalized.id);
        finalPhotos = uploaded;
        normalized.photos = uploaded;
        // Update local state and cache again with final URLs
        await AsyncStorage.setItem('user_profile', JSON.stringify(normalized));
        setCurrentProfileState(normalized);
      }
      
      const syncPhotos = finalPhotos.filter(p => !p.startsWith('file://'));

      const payload = {
        id: normalized.id,
        name: normalized.name || 'User', // Safety fallback
        age: normalized.age,
        gender: normalized.gender,
        interested_in: (normalized.interestedIn ?? null) as any,
        bio: normalized.bio,
        photos: syncPhotos,
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
      };

      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.log('[App] setCurrentProfile upsert error:', error.message);
        throw error;
      }
    } catch (e) {
      console.log('[App] setCurrentProfile server sync failed:', e);
    }
  }, [computeCompleted]);

  const updateProfile = useCallback(async (patch: Partial<User>) => {
    const current = currentProfileRef.current;
    if (!current?.id) {
      console.log('[App] Cannot updateProfile, no user ID');
      return;
    }

    // 1. Proactive upload if photos are being patched
    let finalPhotos = patch.photos;
    if (!TEST_MODE && patch.photos?.some(p => p.startsWith('file://'))) {
      console.log('[App] updateProfile: Local photos detected, uploading...');
      try {
        finalPhotos = await uploadPhotos(patch.photos, current.id);
        patch.photos = finalPhotos;
      } catch (uploadErr) {
        console.log('[App] updateProfile photo upload failed:', uploadErr);
      }
    }

    // 2. Merge and update local state
    const next: User = {
      ...current,
      ...patch,
      ownedThemes: (patch.ownedThemes ?? current.ownedThemes) ?? [],
      profileTheme: (patch.profileTheme ?? current.profileTheme) ?? null,
    } as User;
    
    (next as any).completed = computeCompleted(next);
    
    await AsyncStorage.setItem('user_profile', JSON.stringify(next));
    setCurrentProfileState(next);

    // 3. Sync to Supabase
    if (TEST_MODE) return;

    try {
      const payload = {
        id: next.id,
        name: next.name || 'User', // Safety fallback
        age: next.age,
        gender: next.gender,
        interested_in: (next.interestedIn ?? null) as any,
        bio: next.bio,
        photos: next.photos.filter(p => !p.startsWith('file://')),
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
      };

      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.log('[App] updateProfile server upsert error:', error.message);
        throw error;
      }
    } catch (e) {
      console.log('[App] updateProfile server sync failed:', e);
    }
  }, [computeCompleted]);

  const setFilters = useCallback(async (next: FiltersState) => {
    console.log('[App] setFilters called:', JSON.stringify(next));
    await AsyncStorage.setItem('filters_state', JSON.stringify(next));
    
    const prev = filtersRef.current;
    const genderChanged = next.interestedIn !== prev.interestedIn;
    const rangeChanged = next.distanceKm !== prev.distanceKm || 
                        next.ageMin !== prev.ageMin || 
                        next.ageMax !== prev.ageMax;
    
    setFiltersState(next);
    
    if (genderChanged || allProfiles.length === 0) {
      console.log('[App] Gender filter changed or no profiles, triggering reload');
      dataLoadedRef.current = false;
      setTimeout(() => {
        loadAppData().catch(e => console.error('[App] filter reload failed:', e));
      }, 100);
    } else if (rangeChanged) {
      console.log('[App] Filter range changed, triggering refilter');
      refilterPotential();
    }
  }, [allProfiles.length, loadAppData, refilterPotential]);

  const blockUser = useCallback(async (userId: string) => {
    const myId = currentProfileRef.current?.id;
    setBlockedIds(prev => {
      const next = Array.from(new Set([...prev, userId]));
      AsyncStorage.setItem('blocked_ids', JSON.stringify(next));
      return next;
    });
    setPotentialMatches(prev => prev.filter(u => u.id !== userId));

    if (myId && !TEST_MODE) {
      try {
        await supabase.from('blocks').insert({
          blocker_id: myId,
          blocked_id: userId
        });
        console.log('[App] Block synced to DB');
      } catch (e) {
        console.log('[App] DB block failed', e);
      }
    }
  }, []);

  const swipeUser = useCallback((userId: string, action: 'like' | 'nope' | 'superlike') => {
    const swipe: SwipeAction = {
      userId,
      action,
      timestamp: new Date(),
    };

    setSwipeHistory(prev => {
      const newHistory = [...prev, swipe];
      AsyncStorage.setItem('swipe_history', JSON.stringify(newHistory)).catch(() => { });
      return newHistory;
    });

    setPotentialMatches(prev => prev.filter(u => u.id !== userId));

    if ((action === 'like' || action === 'superlike') && !TEST_MODE) {
      sendPushToUser(userId, {
        title: 'New like',
        body: 'Someone liked your profile. Open the app to check!',
      }).catch(e => console.log('[Push] like notify failed', e));
    }

    return (async () => {
      let matchResult: { isMatch: boolean; matchId?: string } = { isMatch: false };

      if (TEST_MODE) {
        console.log('[App] TEST MODE: Skipping swipe sync to server');
        return matchResult;
      }

      try {
        const storedPhone = await AsyncStorage.getItem('user_phone');
        const storedId = await AsyncStorage.getItem('user_id');
        let myId = currentProfile?.id ?? storedId ?? null;

        if (!myId && storedPhone) {
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('phone', storedPhone)
            .maybeSingle();
          myId = myProfile?.id ?? null;
        }

        if (!myId) {
          console.log('[App] swipe: no user ID found');
          return;
        }

        console.log('[App] inserting swipe:', myId, '->', userId, action);
        const { error: swipeError } = await supabase.from('swipes').upsert(
          { swiper_id: myId, swiped_id: userId, action },
          { onConflict: 'swiper_id,swiped_id' }
        );
        if (swipeError) {
          console.log('[App] swipe upsert error:', swipeError.message);
          const { error: insertErr } = await supabase.from('swipes').insert({ swiper_id: myId, swiped_id: userId, action });
          if (insertErr) {
            console.log('[App] swipe insert fallback error:', insertErr.message);
          }
        } else {
          console.log('[App] swipe recorded successfully');
        }

        // Wait a small amount of time for the DB trigger to finish its work
        await new Promise(resolve => setTimeout(resolve, 300));

        const { data: newMatches, error: matchError } = await supabase
          .from('matches')
          .select('id, user1_id, user2_id, matched_at')
          .or(`user1_id.eq.${myId},user2_id.eq.${myId}`);

        if (!matchError && newMatches) {
          console.log('[App] loaded matches after swipe:', newMatches.length);
          
          // Batch load all matched user profiles in a single query (fixes N+1)
          const otherIds = newMatches.map((m: any) => 
            m.user1_id === myId ? m.user2_id : m.user1_id
          );
          
          let profilesMap = new Map<string, any>();
          try {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id,name,age,gender,bio,photos,interests,city')
              .in('id', otherIds);
            if (profiles) {
              profiles.forEach((p: any) => profilesMap.set(p.id, p));
            }
          } catch (e: any) {
            console.log('[App] Batch profile fetch (post-swipe) error:', e?.message);
          }

          const matchesWithUsers = newMatches.map((m: any) => {
            const otherId = m.user1_id === myId ? m.user2_id : m.user1_id;
            const otherUser = profilesMap.get(otherId);
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
          });

          const validMatches = matchesWithUsers.filter((m: Match | null): m is Match => m !== null);
          setMatches(validMatches);
          
          // Check if the current swipe resulted in a NEW match
          const recentMatch = validMatches.find(m => m.user.id === userId);
          if (recentMatch) {
            matchResult = { isMatch: true, matchId: recentMatch.id };
          }
          console.log('[App] updated matches state:', validMatches.length);
        }
      } catch (e) {
        console.log('[App] swipe sync failed', e);
      }
      return matchResult;
    })();
  }, [currentProfile?.id]);

  const setTier = useCallback(async (next: MembershipTier) => {
    // --- Fix #21: Persist Tier to Database ---
    await AsyncStorage.setItem('tier', JSON.stringify(next));
    setTierState(next);
    
    if (!TEST_MODE && currentProfile?.id) {
      try {
        await supabase
          .from('memberships')
          .upsert({ 
            user_id: currentProfile.id, 
            tier: next,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        console.log('[App] Tier persisted to DB:', next);
      } catch (err) {
        console.warn('[App] Failed to persist tier to DB', err);
      }
    }
  }, [currentProfile?.id]);

  const addCredits = useCallback(async (n: number) => {
    // --- Fix #22: Persist Credits to Database ---
    setCredits(prev => {
      const next = prev + n;
      AsyncStorage.setItem('credits', JSON.stringify(next));
      
      if (!TEST_MODE && currentProfile?.id) {
        (async () => {
          try {
            const { error } = await supabase
              .from('profiles')
              .update({ credits: next })
              .eq('id', currentProfile.id);
            if (error) console.warn('[App] Failed to persist credits to DB', error.message);
            else console.log('[App] Credits persisted to DB:', next);
          } catch (err) {
            console.warn('[App] Credit persist exception', err);
          }
        })();
      }
      return next;
    });
  }, [currentProfile?.id]);

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
          } catch { }
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
        } catch { }
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
    isLoadingProfiles,
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
    refreshProfiles,
  }), [currentProfile, potentialMatches, matches, swipeHistory, tier, credits, filters, isLoadingProfiles, setFilters, setCurrentProfile, updateProfile, swipeUser, setTier, addCredits, blockUser, blockedIds, unlockTheme, setProfileThemeFn, refreshProfiles]);
});