import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Alert, Share, Platform, Animated } from 'react-native';
import Colors from '@/constants/colors';
import { ArrowLeft, Gift, Copy, CheckCircle2, Send, Users, Crown, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { safeGoBack } from '@/lib/navigation';
import { supabase } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import { useMembership } from '@/hooks/membership-context';
import { useI18n } from '@/hooks/i18n-context';

const REQUIRED_INVITES = 20;
const GOLD_REWARD_DAYS = 30;

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
        const { data: p } = await supabase.from('profiles').select('referral_code').eq('id', uid).maybeSingle();
        const code = (p?.referral_code as string | undefined) ?? uid;
        const link = `https://zewijuna.com/join?ref=${code}`;
        setRefLink(link);
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

  const progressPercent = Math.min(100, (referredCount / REQUIRED_INVITES) * 100);
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack(router, '/settings')} style={styles.backBtn} testID="referrals-back">
          <ArrowLeft size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Share & Get Gold</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.body}>
        <Animated.View style={[styles.giftCircle, { transform: [{ scale: pulseAnim }] }]}>
          <Crown size={40} color="#FFD700" />
        </Animated.View>

        <Text style={styles.headline}>Invite 20 Friends{"\n"}Get 1 Month Gold Free</Text>
        <Text style={styles.subheadline}>
          Share your unique link. When 20 friends sign up, you automatically unlock Gold membership for 30 days!
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Users size={20} color={Colors.primary} />
            <Text style={styles.statNumber}>{referredCount}</Text>
            <Text style={styles.statLabel}>Invited</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Sparkles size={20} color="#FFD700" />
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
              <CheckCircle2 size={16} color={Colors.text.white} />
            ) : (
              <Copy size={16} color={Colors.primary} />
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.shareBtn} onPress={onShare} activeOpacity={0.8} testID="share-link">
            <Send size={18} color={Colors.text.white} />
            <Text style={styles.shareBtnText}>Share with Friends</Text>
          </TouchableOpacity>
        </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700' as const, color: Colors.text.primary },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    alignItems: 'center',
  },
  giftCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFE082',
  },
  headline: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 24,
    gap: 24,
  },
  statBox: {
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 28,
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
    backgroundColor: Colors.border,
  },
  progressSection: {
    width: '100%',
    marginBottom: 20,
    gap: 6,
  },
  progressBarOuter: {
    width: '100%',
    height: 10,
    backgroundColor: Colors.border,
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
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
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
  actionsRow: {
    width: '100%',
    marginBottom: 12,
  },
  shareBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
  },
  shareBtnText: {
    color: Colors.text.white,
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
    borderRadius: 14,
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
    backgroundColor: '#FFF8E1',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  rewardTextWrap: {
    flex: 1,
    gap: 4,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#B8860B',
  },
  rewardDesc: {
    fontSize: 12,
    color: '#996515',
    lineHeight: 17,
  },
});
