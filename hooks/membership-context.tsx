import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { MembershipTier, MembershipFeatures, UserCredits, MonthlyAllowances } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from './auth-context';

const TEST_MODE = true;

const TIER_FEATURES: Record<MembershipTier, MembershipFeatures> = {
  free: {
    dailyMessages: TEST_MODE ? 99999 : 5,
    dailyCompliments: TEST_MODE ? 99999 : 1,
    dailyRightSwipes: TEST_MODE ? 'unlimited' : 50,
    profileViews: TEST_MODE ? 'unlimited' : 10,
    advancedFilters: TEST_MODE ? true : false,
    priorityMatching: TEST_MODE ? true : false,
    seeWhoLikedYou: true,
    incognitoMode: TEST_MODE ? true : false,
    profileBoost: TEST_MODE ? true : false,
    rewind: TEST_MODE ? true : false,
    travelMode: TEST_MODE ? true : false,
    hideLocation: TEST_MODE ? true : false,
  },
  silver: {
    dailyMessages: 30,
    dailyCompliments: 1,
    dailyRightSwipes: 100,
    profileViews: 50,
    advancedFilters: false,
    priorityMatching: false,
    seeWhoLikedYou: true,
    incognitoMode: false,
    profileBoost: true,
    rewind: false,
    travelMode: false,
    hideLocation: false,
  },
  gold: {
    dailyMessages: 100,
    dailyCompliments: 5,
    dailyRightSwipes: 'unlimited',
    profileViews: 100,
    advancedFilters: true,
    priorityMatching: true,
    seeWhoLikedYou: true,
    incognitoMode: true,
    profileBoost: true,
    rewind: true,
    travelMode: true,
    hideLocation: true,
  },
  vip: {
    dailyMessages: 99999,
    dailyCompliments: 99999,
    dailyRightSwipes: 'unlimited',
    profileViews: 'unlimited',
    advancedFilters: true,
    priorityMatching: true,
    seeWhoLikedYou: true,
    incognitoMode: true,
    profileBoost: true,
    rewind: true,
    travelMode: true,
    hideLocation: true,
  },
};



interface MembershipContextType {
  tier: MembershipTier;
  features: MembershipFeatures;
  credits: UserCredits;
  allowances: MonthlyAllowances;
  remainingDailyMessages: number;
  remainingProfileViews: number | 'unlimited';
  remainingRightSwipes: number | 'unlimited';
  remainingCompliments: number | 'unlimited';
  upgradeTier: (newTier: MembershipTier) => Promise<void>;
  addCredits: (type: keyof UserCredits, amount: number) => Promise<void>;
  useCredit: (type: keyof UserCredits) => Promise<boolean>;
  useDaily: (type: 'messages' | 'views' | 'rightSwipes' | 'compliments') => Promise<boolean>;
  useBoost: () => Promise<boolean>;
  useSuperLike: () => Promise<boolean>;
  resetDailyLimits: () => Promise<void>;
  grantMonthlyAllowancesIfNeeded: () => Promise<void>;
}

export const [MembershipProvider, useMembership] = createContextHook<MembershipContextType>(() => {
  const { user: authUser } = useAuth();
  const isoToday = useCallback(() => new Date().toISOString().slice(0, 10), []);
  const normalizeISODate = useCallback((value: string | null | undefined): string => {
    if (!value) return isoToday();
    const trimmed = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) return isoToday();
    return d.toISOString().slice(0, 10);
  }, [isoToday]);
  const [tier, setTier] = useState<MembershipTier>('free');
  const [credits, setCredits] = useState<UserCredits>({ messages: 0, boosts: 0, superLikes: 0, compliments: 0, unlocks: 0 });
  const [allowances, setAllowances] = useState<MonthlyAllowances>({ monthlyBoosts: 0, monthlySuperLikes: 0 });
  const [remainingDailyMessages, setRemainingDailyMessages] = useState<number>(TIER_FEATURES.free.dailyMessages);
  const [remainingProfileViews, setRemainingProfileViews] = useState<number | 'unlimited'>(TIER_FEATURES.free.profileViews);
  const [remainingRightSwipes, setRemainingRightSwipes] = useState<number | 'unlimited'>(TIER_FEATURES.free.dailyRightSwipes);
  const [remainingCompliments, setRemainingCompliments] = useState<number | 'unlimited'>(TIER_FEATURES.free.dailyCompliments);
  const [lastReset, setLastReset] = useState<string>(isoToday());
  const [lastAllowanceGrantISO, setLastAllowanceGrantISO] = useState<string>('');

  const loadFromLocalStorage = useCallback(async () => {
    try {
      const [storedTier, storedCredits, storedMessages, storedViews, storedRightSwipes, storedCompliments, storedReset, storedAllowances, storedAllowanceGrant] = await Promise.all([
        AsyncStorage.getItem('membership_tier'),
        AsyncStorage.getItem('membership_credits'),
        AsyncStorage.getItem('remaining_daily_messages'),
        AsyncStorage.getItem('remaining_profile_views'),
        AsyncStorage.getItem('remaining_right_swipes'),
        AsyncStorage.getItem('remaining_compliments'),
        AsyncStorage.getItem('last_reset'),
        AsyncStorage.getItem('monthly_allowances'),
        AsyncStorage.getItem('last_allowance_grant'),
      ]);

      if (storedTier) setTier(JSON.parse(storedTier));
      if (storedCredits) setCredits(JSON.parse(storedCredits));
      if (storedMessages) setRemainingDailyMessages(JSON.parse(storedMessages));
      if (storedViews) setRemainingProfileViews(JSON.parse(storedViews));
      if (storedRightSwipes) setRemainingRightSwipes(JSON.parse(storedRightSwipes));
      if (storedCompliments) setRemainingCompliments(JSON.parse(storedCompliments));
      if (storedReset) setLastReset(normalizeISODate(JSON.parse(storedReset)));
      if (storedAllowances) setAllowances(JSON.parse(storedAllowances));
      if (storedAllowanceGrant) setLastAllowanceGrantISO(String(JSON.parse(storedAllowanceGrant) ?? ''));
    } catch (error: any) {
      console.error('Error loading from local storage:', error.message || error);
    }
  }, [normalizeISODate]);

  const syncToStorage = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem('membership_tier', JSON.stringify(tier)),
        AsyncStorage.setItem('membership_credits', JSON.stringify(credits)),
        AsyncStorage.setItem('remaining_daily_messages', JSON.stringify(remainingDailyMessages)),
        AsyncStorage.setItem('remaining_profile_views', JSON.stringify(remainingProfileViews)),
        AsyncStorage.setItem('remaining_right_swipes', JSON.stringify(remainingRightSwipes)),
        AsyncStorage.setItem('remaining_compliments', JSON.stringify(remainingCompliments)),
        AsyncStorage.setItem('last_reset', JSON.stringify(lastReset)),
        AsyncStorage.setItem('monthly_allowances', JSON.stringify(allowances)),
        AsyncStorage.setItem('last_allowance_grant', JSON.stringify(lastAllowanceGrantISO)),
      ]);
    } catch (error: any) {
      console.error('Error syncing to storage:', error.message || error);
    }
  }, [tier, credits, remainingDailyMessages, remainingProfileViews, remainingRightSwipes, remainingCompliments, lastReset, allowances, lastAllowanceGrantISO]);

  const syncToServer = useCallback(async () => {
    try {
      if (!isSupabaseConfigured) {
        console.log('[Membership] Skipping server sync: Supabase not configured');
        return;
      }
      const storedPhone = await AsyncStorage.getItem('user_phone');
      if (!storedPhone) {
        console.log('[Membership] No phone, skipping server sync');
        return;
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', storedPhone)
        .maybeSingle();
      
      const userId = profile?.id ?? authUser?.id ?? null;
      if (!userId) {
        console.log('[Membership] No user ID found, skipping server sync');
        return;
      }
      
      console.log('[Membership] Syncing to server for user:', userId);
      
      const payload = {
        user_id: userId,
        phone_number: storedPhone,
        tier,
        message_credits: credits.messages,
        boost_credits: credits.boosts,
        superlike_credits: credits.superLikes,
        compliment_credits: credits.compliments,
        unlock_credits: credits.unlocks,
        remaining_daily_messages: remainingDailyMessages,
        remaining_profile_views: remainingProfileViews === 'unlimited' ? null : remainingProfileViews,
        remaining_right_swipes: remainingRightSwipes === 'unlimited' ? null : remainingRightSwipes,
        remaining_compliments: remainingCompliments === 'unlimited' ? null : remainingCompliments,
        last_reset: normalizeISODate(lastReset),
        monthly_allowances: allowances,
        last_allowance_grant: lastAllowanceGrantISO && lastAllowanceGrantISO.trim().length > 0 ? new Date(lastAllowanceGrantISO).toISOString() : null,
      } as const;

      const { error: upsertErr } = await supabase
        .from('memberships')
        .upsert(payload as any, { onConflict: 'user_id' });
      
      if (upsertErr) {
        console.log('[Membership] Supabase upsert failed:', upsertErr.message);
      } else {
        console.log('[Membership] Successfully synced to server');
      }
    } catch (e: any) {
      console.log('[Membership] syncToServer failed:', e?.message || e);
    }
  }, [authUser?.id, tier, credits, remainingDailyMessages, remainingProfileViews, remainingRightSwipes, remainingCompliments, lastReset, allowances, lastAllowanceGrantISO, normalizeISODate]);

  const checkExpiration = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('memberships')
        .select('tier, expires_at')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (data && data.expires_at && data.tier !== 'free') {
        const expiresAt = new Date(data.expires_at);
        const now = new Date();
        
        if (now >= expiresAt) {
          console.log('[Membership] Membership expired, downgrading to free');
          await supabase
            .from('memberships')
            .update({ tier: 'free', expires_at: null, updated_at: now.toISOString() })
            .eq('user_id', userId);
          return 'free';
        }
      }
      
      return data?.tier || 'free';
    } catch (e: any) {
      console.log('[Membership] checkExpiration failed:', e?.message || e);
      return null;
    }
  }, []);

  const loadFromServer = useCallback(async () => {
    try {
      if (!isSupabaseConfigured) {
        console.log('[Membership] Supabase not configured; loading from local only');
        await loadFromLocalStorage();
        return;
      }
      
      const storedPhone = await AsyncStorage.getItem('user_phone');
      if (!storedPhone) {
        console.log('[Membership] No phone, loading from local only');
        await loadFromLocalStorage();
        return;
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', storedPhone)
        .maybeSingle();
      
      const userId = profile?.id ?? authUser?.id ?? null;
      if (!userId) {
        console.log('[Membership] No user ID, loading from local only');
        await loadFromLocalStorage();
        return;
      }
      
      console.log('[Membership] Loading from server for user:', userId);
      
      const checkedTier = await checkExpiration(userId);
      
      const { data, error } = await supabase
        .from('memberships')
        .select('tier, message_credits, boost_credits, superlike_credits, compliment_credits, unlock_credits, remaining_daily_messages, remaining_profile_views, remaining_right_swipes, remaining_compliments, last_reset, monthly_allowances, last_allowance_grant, expires_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        console.log('[Membership] Load from server error (using local fallback):', error.message);
        await loadFromLocalStorage();
        return;
      }
      if (data) {
        console.log('[Membership] Loaded from server:', data);
        const serverTier = (checkedTier || data.tier) as MembershipTier;
        setTier(serverTier);
        setCredits({
          messages: Number((data as any).message_credits ?? 0),
          boosts: Number((data as any).boost_credits ?? 0),
          superLikes: Number((data as any).superlike_credits ?? 0),
          compliments: Number((data as any).compliment_credits ?? 0),
          unlocks: Number((data as any).unlock_credits ?? 0),
        });
        const f = TIER_FEATURES[serverTier];
        const dailyMessages = Number(data.remaining_daily_messages ?? f.dailyMessages);
        setRemainingDailyMessages(Number.isFinite(dailyMessages) ? dailyMessages : f.dailyMessages);
        setRemainingProfileViews((data.remaining_profile_views ?? f.profileViews) as number | 'unlimited');
        setRemainingRightSwipes((data.remaining_right_swipes ?? f.dailyRightSwipes) as number | 'unlimited');
        setRemainingCompliments((data.remaining_compliments ?? f.dailyCompliments) as number | 'unlimited');
        setAllowances((data.monthly_allowances as MonthlyAllowances) ?? { monthlyBoosts: 0, monthlySuperLikes: 0 });
        setLastAllowanceGrantISO(String(data.last_allowance_grant ?? ''));
        setLastReset(normalizeISODate((data as any).last_reset ?? null));
        
        if (data.expires_at) {
          const expiresAt = new Date(data.expires_at);
          const now = new Date();
          const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          console.log(`[Membership] Membership expires in ${daysLeft} days (${expiresAt.toISOString()})`);
        }
      } else {
        console.log('[Membership] No membership found, creating one');
        await loadFromLocalStorage();
        await syncToServer();
      }
    } catch (e: any) {
      console.log('[Membership] loadFromServer failed (using local fallback):', e?.message || e);
      await loadFromLocalStorage();
    }
  }, [authUser?.id, loadFromLocalStorage, syncToServer, checkExpiration, normalizeISODate]);

  const resetDailyLimits = useCallback(async () => {
    const f = TIER_FEATURES[tier];
    setRemainingDailyMessages(f.dailyMessages);
    setRemainingProfileViews(f.profileViews);
    setRemainingRightSwipes(f.dailyRightSwipes);
    setRemainingCompliments(f.dailyCompliments);
    setLastReset(isoToday());
  }, [tier, isoToday]);

  const upgradeTier = useCallback(async (newTier: MembershipTier) => {
    setTier(newTier);
    const f = TIER_FEATURES[newTier];
    setRemainingDailyMessages(f.dailyMessages);
    setRemainingProfileViews(f.profileViews);
    setRemainingRightSwipes(f.dailyRightSwipes);
    setRemainingCompliments(f.dailyCompliments);
  }, []);

  const addCredits = useCallback(async (type: keyof UserCredits, amount: number) => {
    setCredits(prev => ({ ...prev, [type]: prev[type] + amount }));
  }, []);

  const useCredit = useCallback(async (type: keyof UserCredits): Promise<boolean> => {
    if (tier === 'vip' && (type === 'boosts' || type === 'unlocks')) {
      return true;
    }
    if (credits[type] <= 0) return false;
    setCredits(prev => ({ ...prev, [type]: prev[type] - 1 }));
    return true;
  }, [credits, tier]);

  const useDaily = useCallback(async (type: 'messages' | 'views' | 'rightSwipes' | 'compliments'): Promise<boolean> => {
    const f = TIER_FEATURES[tier];
    
    if (type === 'messages') {
      if (tier === 'vip') return true;
      if (f.dailyMessages === 99999) return true;
      if (remainingDailyMessages <= 0) return false;
      setRemainingDailyMessages(prev => prev - 1);
      return true;
    }
    
    if (type === 'views') {
      if (tier === 'vip') return true;
      if (f.profileViews === 'unlimited') return true;
      if (typeof remainingProfileViews === 'number' && remainingProfileViews <= 0) return false;
      if (typeof remainingProfileViews === 'number') setRemainingProfileViews(remainingProfileViews - 1);
      return true;
    }
    
    if (type === 'rightSwipes') {
      if (tier === 'vip' || tier === 'gold') return true;
      if (f.dailyRightSwipes === 'unlimited') return true;
      if (typeof remainingRightSwipes === 'number' && remainingRightSwipes <= 0) return false;
      if (typeof remainingRightSwipes === 'number') setRemainingRightSwipes(remainingRightSwipes - 1);
      return true;
    }
    
    if (type === 'compliments') {
      if (tier === 'vip') return true;
      if (f.dailyCompliments === 99999) return true;
      if (typeof remainingCompliments === 'number' && remainingCompliments <= 0) return false;
      if (typeof remainingCompliments === 'number') setRemainingCompliments(remainingCompliments - 1);
      return true;
    }
    
    return false;
  }, [remainingDailyMessages, remainingProfileViews, remainingRightSwipes, remainingCompliments, tier]);

  const grantMonthlyAllowancesIfNeeded = useCallback(async () => {
    const now = new Date();
    const last = lastAllowanceGrantISO ? new Date(lastAllowanceGrantISO) : null;
    const shouldGrant = !last || now.getMonth() !== last.getMonth() || now.getFullYear() !== last.getFullYear();
    if (!shouldGrant) return;

    const base: MonthlyAllowances =
      tier === 'vip' ? { monthlyBoosts: 5, monthlySuperLikes: 20 } :
      tier === 'gold' ? { monthlyBoosts: 2, monthlySuperLikes: 10 } :
      tier === 'silver' ? { monthlyBoosts: 1, monthlySuperLikes: 5 } :
      { monthlyBoosts: 0, monthlySuperLikes: 0 };
    setAllowances(base);
    setLastAllowanceGrantISO(now.toISOString());
  }, [lastAllowanceGrantISO, tier]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFromServer().catch(e => console.error('[Membership] loadFromServer failed:', e));
    }, 200);
    return () => clearTimeout(timer);
  }, [loadFromServer]);

  useEffect(() => {
    const today = isoToday();
    if (normalizeISODate(lastReset) !== today) {
      resetDailyLimits();
    }
  }, [lastReset, resetDailyLimits, isoToday, normalizeISODate]);

  useEffect(() => {
    grantMonthlyAllowancesIfNeeded();
  }, [grantMonthlyAllowancesIfNeeded]);

  useEffect(() => {
    const timer = setTimeout(() => {
      syncToStorage().catch(e => console.error('[Membership] syncToStorage failed:', e));
      syncToServer().catch(e => console.error('[Membership] syncToServer failed:', e));
    }, 500);
    return () => clearTimeout(timer);
  }, [tier, credits, allowances, remainingDailyMessages, remainingProfileViews, remainingRightSwipes, remainingCompliments, lastReset, lastAllowanceGrantISO, syncToStorage, syncToServer]);

  const useBoost = useCallback(async (): Promise<boolean> => {
    if (tier === 'vip') {
      return true;
    }
    if (allowances.monthlyBoosts > 0) {
      setAllowances(prev => ({ ...prev, monthlyBoosts: prev.monthlyBoosts - 1 }));
      return true;
    }
    if (credits.boosts > 0) {
      setCredits(prev => ({ ...prev, boosts: prev.boosts - 1 }));
      return true;
    }
    return false;
  }, [tier, allowances.monthlyBoosts, credits.boosts]);

  const useSuperLike = useCallback(async (): Promise<boolean> => {
    if (allowances.monthlySuperLikes > 0) {
      setAllowances(prev => ({ ...prev, monthlySuperLikes: prev.monthlySuperLikes - 1 }));
      return true;
    }
    if (credits.superLikes > 0) {
      setCredits(prev => ({ ...prev, superLikes: prev.superLikes - 1 }));
      return true;
    }
    return false;
  }, [allowances.monthlySuperLikes, credits.superLikes]);

  return useMemo(() => ({
    tier,
    features: TIER_FEATURES[tier],
    credits,
    allowances,
    remainingDailyMessages,
    remainingProfileViews,
    remainingRightSwipes,
    remainingCompliments,
    upgradeTier,
    addCredits,
    useCredit,
    useDaily: useDaily,
    useBoost,
    useSuperLike,
    resetDailyLimits,
    grantMonthlyAllowancesIfNeeded,
  }), [tier, credits, allowances, remainingDailyMessages, remainingProfileViews, remainingRightSwipes, remainingCompliments, upgradeTier, addCredits, useCredit, useDaily, useBoost, useSuperLike, resetDailyLimits, grantMonthlyAllowancesIfNeeded]);
});
