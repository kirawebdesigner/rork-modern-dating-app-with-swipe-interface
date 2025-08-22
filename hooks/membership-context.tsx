import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { MembershipTier, MembershipFeatures, UserCredits, MonthlyAllowances } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from './auth-context';

const TIER_FEATURES: Record<MembershipTier, MembershipFeatures> = {
  free: {
    dailyMessages: 5,
    dailyCompliments: 1,
    dailyRightSwipes: 50,
    profileViews: 50,
    advancedFilters: false,
    priorityMatching: false,
    seeWhoLikedYou: true,
    incognitoMode: false,
    profileBoost: false,
    rewind: false,
    travelMode: false,
    hideLocation: false,
  },
  gold: {
    dailyMessages: 100,
    dailyCompliments: 5,
    dailyRightSwipes: 'unlimited',
    profileViews: 200,
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
  const [tier, setTier] = useState<MembershipTier>('free');
  const [credits, setCredits] = useState<UserCredits>({ messages: 0, boosts: 0, superLikes: 0, compliments: 0, unlocks: 0 });
  const [allowances, setAllowances] = useState<MonthlyAllowances>({ monthlyBoosts: 0, monthlySuperLikes: 0 });
  const [remainingDailyMessages, setRemainingDailyMessages] = useState<number>(TIER_FEATURES.free.dailyMessages);
  const [remainingProfileViews, setRemainingProfileViews] = useState<number | 'unlimited'>(TIER_FEATURES.free.profileViews);
  const [remainingRightSwipes, setRemainingRightSwipes] = useState<number | 'unlimited'>(TIER_FEATURES.free.dailyRightSwipes);
  const [remainingCompliments, setRemainingCompliments] = useState<number | 'unlimited'>(TIER_FEATURES.free.dailyCompliments);
  const [lastReset, setLastReset] = useState<string>(new Date().toDateString());
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
      if (storedReset) setLastReset(JSON.parse(storedReset));
      if (storedAllowances) setAllowances(JSON.parse(storedAllowances));
      if (storedAllowanceGrant) setLastAllowanceGrantISO(JSON.parse(storedAllowanceGrant));
    } catch (error: any) {
      console.error('Error loading from local storage:', error.message || error);
    }
  }, []);

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
      const { data: u } = await supabase.auth.getUser();
      const userId = u?.user?.id ?? authUser?.id ?? null;
      if (!userId) {
        console.log('[Membership] No user, skipping server sync');
        return;
      }
      const payload = {
        user_id: userId,
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
        last_reset: lastReset,
        monthly_allowances: allowances,
        last_allowance_grant: lastAllowanceGrantISO,
      } as const;
      const { error } = await supabase.from('memberships').upsert(payload, { onConflict: 'user_id' });
      if (error) {
        console.error('[Membership] Supabase upsert error:', error.message);
      }
    } catch (e: any) {
      console.error('[Membership] syncToServer failed:', e?.message || e);
    }
  }, [authUser?.id, tier, credits, remainingDailyMessages, remainingProfileViews, remainingRightSwipes, remainingCompliments, lastReset, allowances, lastAllowanceGrantISO]);

  const loadFromServer = useCallback(async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u?.user?.id ?? authUser?.id ?? null;
      if (!userId) {
        console.log('[Membership] No user, loading from local only');
        await loadFromLocalStorage();
        return;
      }
      const { data, error } = await supabase
        .from('memberships')
        .select('tier, message_credits, boost_credits, superlike_credits, compliment_credits, unlock_credits, remaining_daily_messages, remaining_profile_views, remaining_right_swipes, remaining_compliments, last_reset, monthly_allowances, last_allowance_grant')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        console.warn('[Membership] Load from server error:', error.message);
        await loadFromLocalStorage();
        return;
      }
      if (data) {
        const serverTier = (data.tier as MembershipTier) ?? 'free';
        setTier(serverTier);
        setCredits({
          messages: Number((data as any).message_credits ?? 0),
          boosts: Number((data as any).boost_credits ?? 0),
          superLikes: Number((data as any).superlike_credits ?? 0),
          compliments: Number((data as any).compliment_credits ?? 0),
          unlocks: Number((data as any).unlock_credits ?? 0),
        });
        setRemainingDailyMessages(Number(data.remaining_daily_messages ?? TIER_FEATURES[serverTier].dailyMessages));
        setRemainingProfileViews((data.remaining_profile_views ?? TIER_FEATURES[serverTier].profileViews) as number | 'unlimited');
        setRemainingRightSwipes((data.remaining_right_swipes ?? TIER_FEATURES[serverTier].dailyRightSwipes) as number | 'unlimited');
        setRemainingCompliments((data.remaining_compliments ?? TIER_FEATURES[serverTier].dailyCompliments) as number | 'unlimited');
        setAllowances((data.monthly_allowances as MonthlyAllowances) ?? { monthlyBoosts: 0, monthlySuperLikes: 0 });
        setLastAllowanceGrantISO(String(data.last_allowance_grant ?? ''));
        setLastReset(String(data.last_reset ?? new Date().toDateString()));
      } else {
        await loadFromLocalStorage();
        await syncToServer();
      }
    } catch (e: any) {
      console.error('[Membership] loadFromServer failed:', e?.message || e);
      await loadFromLocalStorage();
    }
  }, [authUser?.id, loadFromLocalStorage, syncToServer]);

  const resetDailyLimits = useCallback(async () => {
    const f = TIER_FEATURES[tier];
    setRemainingDailyMessages(f.dailyMessages);
    setRemainingProfileViews(f.profileViews);
    setRemainingRightSwipes(f.dailyRightSwipes);
    setRemainingCompliments(f.dailyCompliments);
    setLastReset(new Date().toDateString());
  }, [tier]);

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
    if (credits[type] <= 0) return false;
    setCredits(prev => ({ ...prev, [type]: prev[type] - 1 }));
    return true;
  }, [credits]);

  const useDaily = useCallback(async (type: 'messages' | 'views' | 'rightSwipes' | 'compliments'): Promise<boolean> => {
    const f = TIER_FEATURES[tier];
    if (type === 'messages') {
      if (remainingDailyMessages <= 0) return f.dailyMessages === 99999;
      setRemainingDailyMessages(prev => prev - 1);
      return true;
    }
    if (type === 'views') {
      if (f.profileViews === 'unlimited') return true;
      if (typeof remainingProfileViews === 'number' && remainingProfileViews <= 0) return false;
      if (typeof remainingProfileViews === 'number') setRemainingProfileViews(remainingProfileViews - 1);
      return true;
    }
    if (type === 'rightSwipes') {
      if (f.dailyRightSwipes === 'unlimited') return true;
      if (typeof remainingRightSwipes === 'number' && remainingRightSwipes <= 0) return false;
      if (typeof remainingRightSwipes === 'number') setRemainingRightSwipes(remainingRightSwipes - 1);
      return true;
    }
    if (type === 'compliments') {
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

    const base: MonthlyAllowances = tier === 'gold' ? { monthlyBoosts: 1, monthlySuperLikes: 5 } : tier === 'vip' ? { monthlyBoosts: 2, monthlySuperLikes: 15 } : { monthlyBoosts: 0, monthlySuperLikes: 0 };
    setAllowances(base);
    setLastAllowanceGrantISO(now.toISOString());
  }, [lastAllowanceGrantISO, tier]);

  useEffect(() => {
    loadFromServer();
  }, [loadFromServer]);

  useEffect(() => {
    const today = new Date().toDateString();
    if (lastReset !== today) {
      resetDailyLimits();
    }
  }, [lastReset, resetDailyLimits]);

  useEffect(() => {
    grantMonthlyAllowancesIfNeeded();
  }, [grantMonthlyAllowancesIfNeeded]);

  useEffect(() => {
    syncToStorage();
    syncToServer();
  }, [tier, credits, allowances, remainingDailyMessages, remainingProfileViews, remainingRightSwipes, remainingCompliments, lastReset, lastAllowanceGrantISO, syncToStorage, syncToServer]);

  const useBoost = useCallback(async (): Promise<boolean> => {
    if (allowances.monthlyBoosts > 0) {
      setAllowances(prev => ({ ...prev, monthlyBoosts: prev.monthlyBoosts - 1 }));
      return true;
    }
    if (credits.boosts > 0) {
      setCredits(prev => ({ ...prev, boosts: prev.boosts - 1 }));
      return true;
    }
    return false;
  }, [allowances.monthlyBoosts, credits.boosts]);

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