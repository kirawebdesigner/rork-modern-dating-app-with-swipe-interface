import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share, Platform, Animated } from 'react-native';
import Colors from '@/constants/colors';
import { ArrowLeft, Gift, Copy, CheckCircle2, Send, Users, Crown, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { safeGoBack } from '@/lib/navigation';
import { supabase } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import { useMembership } from '@/hooks/membership-context';
import { useI18n } from '@/hooks/i18n-context';
import Constants from 'expo-constants';

const REQUIRED_INVITES = 20;
const GOLD_REWARD_DAYS = 30;

function getAppBaseUrl(): string {
  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID ?? Constants.expoConfig?.extra?.eas?.projectId ?? '';
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  if (projectId) {
    return `https://p_${projectId}.rork.live`;
  }
  return 'https://zewijuna.com';
}

export default function ReferralsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { upgradeTier } = useMembership();
  const [refLink, setRefLink] = useState<string>('');
  const [referredCount, setReferredCount] = useState<number>(0);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: Math.min(1, referredCount / REQUIRED_INVITES),
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [referredCount, progressAnim]);

  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u.user?.id ?? '';
        if (!uid) {
          console.log('[Referral] No user ID found');
          return;
        }
        const { data: p } = await supabase.from('profiles').select('referral_code').eq('id', uid).maybeSingle();
        const code = (p?.referral_code as string | undefined) ?? uid;
        const baseUrl = getAppBaseUrl();
        const link = `${baseUrl}?ref=${code}`;
        setRefLink(link);
        console.log('[Referral] Generated link:', link);

        const { count } = await supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', uid);
        setReferredCount(count ?? 0);
        console.log('[Referral] Loaded referral count:', count);
      } catch (e) {
        console.log('[Referral] init error', e);
      }
    })();
  }, []);

  const copyLink = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(refLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.log('[Referral] copy error', e);
    }
  }, [refLink]);

  const onShare = useCallback(async () => {
    try {
      const message = `Join me on Zewijuna! Use my link to sign up and we both get rewarded: ${refLink}`;
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(message);
        Alert.alert('Copied!', 'Share message copied to clipboard.');
      } else {
        await Share.share({ message, title: 'Join Zewijuna' });
      }
    } catch (e) {
      console.log('[Referral] share error', e);
    }
  }, [refLink]);

  const checkEligibility = useCallback(async () => {
    setIsChecking(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? '';
      const { count } = await supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', uid);
      const total = count ?? 0;
      setReferredCount(total);
      console.log('[Referral] Check eligibility, count:', total);

      if (total >= REQUIRED_INVITES) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + GOLD_REWARD_DAYS);

        const { error: updateErr } = await supabase
          .from('memberships')
          .update({
            tier: 'gold',
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', uid);

        if (updateErr) {
          console.log('[Referral] Update membership error:', updateErr);
          Alert.alert('Error', 'Could not upgrade. Please try again.');
        } else {
          await upgradeTier('gold');
          Alert.alert(
            'You Got Gold!',
            `Congratulations! You referred ${total} friends and earned 1 month of Gold membership! Enjoy all premium features.`,
            [{ text: 'Awesome!' }]
          );
        }
      } else {
        const remaining = REQUIRED_INVITES - total;
        Alert.alert(
          'Keep Going!',
          `You have ${total} referral${total !== 1 ? 's' : ''}. Invite ${remaining} more friend${remaining !== 1 ? 's' : ''} to unlock Gold for free!`
        );
      }
    } catch (e) {
      console.log('[Referral] check error', e);
      Alert.alert('Error', 'Could not check progress. Please try again.');
    } finally {
      setIsChecking(false);
    }
  }, [upgradeTier]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack(router, '/settings')} style={styles.backBtn} testID="referrals-back">
          <ArrowLeft size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite & Earn</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <Animated.View style={[styles.giftCircle, { transform: [{ scale: pulseAnim }] }]}>
          <Crown size={36} color="#FFD700" />
        </Animated.View>

        <Text style={styles.headline}>Invite 20 Friends</Text>
        <Text style={styles.subheadline}>Get 1 month of Gold membership free</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={[styles.statIconBg, { backgroundColor: '#EDE9FE' }]}>
              <Users size={18} color="#8B5CF6" />
            </View>
            <Text style={styles.statNumber}>{referredCount}</Text>
            <Text style={styles.statLabel}>Invited</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
              <Sparkles size={18} color="#F59E0B" />
            </View>
            <Text style={styles.statNumber}>{Math.max(0, REQUIRED_INVITES - referredCount)}</Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressBarOuter}>
            <Animated.View style={[styles.progressBarInner, { width: progressWidth }]} />
          </View>
          <Text style={styles.progressLabel}>{referredCount}/{REQUIRED_INVITES} referrals</Text>
        </View>

        <TouchableOpacity style={styles.linkRow} onPress={copyLink} activeOpacity={0.7} testID="copy-ref-link">
          <Text style={styles.linkText} numberOfLines={1}>{refLink || 'Loading...'}</Text>
          <View style={[styles.copyBadge, copied && styles.copyBadgeActive]}>
            {copied ? (
              <CheckCircle2 size={16} color="#FFF" />
            ) : (
              <Copy size={16} color={Colors.primary} />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareBtn} onPress={onShare} activeOpacity={0.8} testID="share-link">
          <Send size={18} color="#FFF" />
          <Text style={styles.shareBtnText}>Share with Friends</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.checkBtn, isChecking && styles.checkBtnDisabled]}
          onPress={checkEligibility}
          disabled={isChecking}
          activeOpacity={0.8}
          testID="check-ref-progress"
        >
          <CheckCircle2 size={18} color={Colors.primary} />
          <Text style={styles.checkBtnText}>{isChecking ? 'Checking...' : 'Check My Progress'}</Text>
        </TouchableOpacity>

        <View style={styles.rewardCard}>
          <Gift size={20} color="#FFD700" />
          <View style={styles.rewardTextWrap}>
            <Text style={styles.rewardTitle}>Gold Membership Reward</Text>
            <Text style={styles.rewardDesc}>Unlimited swipes, 100 messages/day, advanced filters, incognito mode, and more for 30 days!</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 12,
    backgroundColor: '#F8F8FA',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
  },
  giftCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#FFD700',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFE082',
  },
  headline: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subheadline: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 32,
    marginBottom: 20,
    gap: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statBox: {
    alignItems: 'center',
    gap: 6,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500' as const,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F3F4F6',
  },
  progressSection: {
    width: '100%',
    marginBottom: 20,
    gap: 6,
  },
  progressBarOuter: {
    width: '100%',
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarInner: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 999,
  },
  progressLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  linkRow: {
    width: '100%',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  linkText: {
    color: Colors.text.primary,
    flex: 1,
    fontSize: 13,
  },
  copyBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBadgeActive: {
    backgroundColor: Colors.success,
  },
  shareBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  shareBtnText: {
    color: '#FFF',
    fontWeight: '700' as const,
    fontSize: 16,
  },
  checkBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
    marginBottom: 24,
  },
  checkBtnDisabled: {
    opacity: 0.6,
  },
  checkBtnText: {
    color: Colors.primary,
    fontWeight: '700' as const,
    fontSize: 15,
  },
  rewardCard: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  rewardTextWrap: {
    flex: 1,
    gap: 4,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#B45309',
  },
  rewardDesc: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
});
