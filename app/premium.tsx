import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  Platform,
  Image,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Check, Crown, Eye, Heart, Zap, MessageCircle, Filter, EyeOff, Star, ArrowRight, Info, BadgePercent, Phone } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GradientButton from '@/components/GradientButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useMembership } from '@/hooks/membership-context';
import { MembershipTier, ThemeId } from '@/types';
import { useApp } from '@/hooks/app-context';
import { trpc } from '@/lib/trpc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

interface TierFeature {
  icon: any;
  text: string;
  included: boolean;
}

interface TierInfo {
  name: string;
  priceMonthly: number;
  color: string;
  gradient: string[];
  popular?: boolean;
  features: TierFeature[];
}

const tierData: Record<MembershipTier, TierInfo> = {
  free: {
    name: 'Free',
    priceMonthly: 0,
    color: Colors.text.secondary,
    gradient: [Colors.backgroundSecondary, Colors.backgroundSecondary],
    features: [
      { icon: MessageCircle, text: '5 messages/day', included: true },
      { icon: Heart, text: '50 right swipes/day', included: true },
      { icon: Eye, text: '10 profile views/day', included: true },
      { icon: Filter, text: 'Basic filters (age, gender)', included: true },
      { icon: Heart, text: 'See who liked you', included: true },
      { icon: Zap, text: 'Occasional boosts', included: true },
      { icon: EyeOff, text: 'Incognito mode', included: false },
      { icon: Star, text: 'Rewind last swipe', included: false },
    ],
  },
  silver: {
    name: 'Silver',
    priceMonthly: 10,
    color: '#C0C0C0',
    gradient: ['#C0C0C0', '#9CA3AF'],
    features: [
      { icon: MessageCircle, text: '30 messages/day', included: true },
      { icon: Heart, text: '100 right swipes/day', included: true },
      { icon: Eye, text: '50 profile views/day', included: true },
      { icon: Filter, text: 'Advanced filters', included: false },
      { icon: Star, text: 'Undo last swipe', included: false },
      { icon: Zap, text: '1 monthly boost & 5 super likes', included: true },
      { icon: EyeOff, text: 'Incognito mode', included: false },
    ],
  },
  gold: {
    name: 'Gold',
    priceMonthly: 20,
    color: '#FFD700',
    gradient: ['#FFE55C', '#FFD700'],
    popular: true,
    features: [
      { icon: MessageCircle, text: '100 messages/day', included: true },
      { icon: Heart, text: 'Unlimited right swipes', included: true },
      { icon: Eye, text: '100 profile views/day', included: true },
      { icon: Filter, text: 'Advanced filters (education, height, location)', included: true },
      { icon: EyeOff, text: 'Incognito + Hide location', included: true },
      { icon: Star, text: 'Undo last swipe', included: true },
      { icon: Zap, text: '2 boosts & 10 super likes/month', included: true },
    ],
  },
  vip: {
    name: 'VIP',
    priceMonthly: 30,
    color: '#8A2BE2',
    gradient: ['#9932CC', '#8A2BE2'],
    features: [
      { icon: MessageCircle, text: 'Unlimited messages', included: true },
      { icon: Heart, text: 'Unlimited right swipes', included: true },
      { icon: Eye, text: 'Unlimited profile views', included: true },
      { icon: Filter, text: 'All advanced filters', included: true },
      { icon: EyeOff, text: 'Full Incognito + Hide location', included: true },
      { icon: Star, text: 'Undo + Priority matching', included: true },
      { icon: Zap, text: '5 boosts & 20 super likes/month', included: true },
    ],
  },
};

export default function PremiumScreen() {
  const router = useRouter();
  const { tier, upgradeTier, addCredits, resetDailyLimits, grantMonthlyAllowancesIfNeeded } = useMembership();
  const { unlockTheme, setTier: setAppTier } = useApp();
  const [selectedTier, setSelectedTier] = useState<MembershipTier>('silver');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [showPromo, setShowPromo] = useState<boolean>(false);
  const [userPhone, setUserPhone] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const upgradeMutation = trpc.membership.upgrade.useMutation();



  useEffect(() => {
    const loadPhone = async () => {
      try {
        const storedPhone = await AsyncStorage.getItem('user_phone');
        if (storedPhone) {
          setUserPhone(storedPhone);
        }
      } catch (e) {
        console.log('[Premium] Failed to load phone', e);
      }
    };
    loadPhone();
  }, []);

  const handleUpgrade = async () => {
    try {
      if (!userPhone) {
        Alert.alert('Phone Required', 'Please log in first to upgrade your membership.');
        return;
      }

      if (selectedTier === 'free') {
        Alert.alert('Free Tier', 'You are currently on the free plan. Select a paid tier to upgrade.');
        return;
      }

      if (selectedTier === tier) {
        Alert.alert('Current Plan', `You are already subscribed to the ${tierData[selectedTier].name} plan.`);
        return;
      }

      setIsProcessing(true);
      console.log('[Premium] Creating payment for tier:', selectedTier);

      const result = await upgradeMutation.mutateAsync({
        tier: selectedTier,
        phone: userPhone,
        successUrl: 'myapp://payment-success',
        cancelUrl: 'myapp://payment-cancelled',
        errorUrl: 'myapp://payment-error',
      });

      if (result.requiresPayment && result.paymentUrl) {
        console.log('[Premium] Opening payment URL:', result.paymentUrl);
        const supported = await Linking.canOpenURL(result.paymentUrl);
        if (supported) {
          await Linking.openURL(result.paymentUrl);
          Alert.alert(
            '💳 Payment in Progress',
            'Complete your payment on ArifPay. Once confirmed, your membership will be activated automatically.',
            [
              {
                text: 'Got it',
                onPress: () => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/(tabs)/profile' as any);
                  }
                },
              },
            ]
          );
        } else {
          Alert.alert('Error', 'Cannot open payment link. Please try again later.');
        }
      } else {
        Alert.alert('✅ Success', 'Your membership has been upgraded successfully!');
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)/profile' as any);
        }
      }
    } catch (e) {
      console.error('[Premium] handleUpgrade error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      Alert.alert('❌ Payment Failed', `Failed to create payment: ${errorMessage}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const onBuyPack = async (type: 'superLikes' | 'boosts' | 'compliments', amount: number) => {
    await addCredits(type as any, amount);
    Alert.alert('Purchased', `Added ${amount} ${type}.`);
  };


  const USD_TO_ETB = 160;
  const formatETB = (amount: number) => `${amount * USD_TO_ETB} ETB`;
  const formatDual = useCallback((usdAmount: number) => formatETB(usdAmount), []);

  const selectedPriceLabel = useMemo(() => {
    const info = tierData[selectedTier];
    if (billingPeriod === 'monthly') return `${formatDual(info.priceMonthly)}/month`;
    return `${formatDual(info.priceMonthly * 6)}/year (-50%)`;
  }, [selectedTier, billingPeriod, formatDual]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)/profile' as any); } }} style={styles.closeButton}>
          <X size={24} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient
          colors={tierData[selectedTier].gradient as [string, string]}
          style={styles.heroSection}
        >
          <Crown size={60} color={Colors.text.white} />
          <Text style={styles.heroTitle}>Choose Your Plan</Text>
          <Text style={styles.heroSubtitle} testID="current-plan">Current plan: {tierData[tier].name}</Text>
          {userPhone && (
            <View style={styles.phoneRow}>
              <Phone size={14} color={Colors.text.white} />
              <Text style={styles.phoneText}>{userPhone}</Text>
            </View>
          )}
          <View style={styles.badgesRow}>
            <View style={styles.bonusBadge}>
              <Info size={14} color={Colors.text.white} />
              <Text style={styles.bonusText}>Secure Payment</Text>
            </View>
            <View style={styles.offBadge}>
              <BadgePercent size={14} color={Colors.text.white} />
              <Text style={styles.offText}>Yearly -50% OFF</Text>
            </View>
          </View>
          <View style={styles.billingToggle}>
            <TouchableOpacity
              style={[styles.billingPill, billingPeriod === 'monthly' && styles.billingPillActive]}
              onPress={() => setBillingPeriod('monthly')}
              testID="billing-monthly"
            >
              <Text style={[styles.billingText, billingPeriod === 'monthly' && styles.billingTextActive]}>Monthly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.billingPill, billingPeriod === 'yearly' && styles.billingPillActive]}
              onPress={() => { setBillingPeriod('yearly'); setShowPromo(true); }}
              testID="billing-yearly"
            >
              <Text style={[styles.billingText, billingPeriod === 'yearly' && styles.billingTextActive]}>Yearly</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.priceHighlight}>{selectedPriceLabel}</Text>
          <View style={styles.securePaymentRow}>
            <View style={styles.securePaymentBadge}>
              <Text style={styles.securePaymentText}>🔒 Powered by ArifPay</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.tiersSection}>
          {(Object.keys(tierData) as MembershipTier[]).map((tierKey) => {
            const tierInfo = tierData[tierKey];
            const isSelected = selectedTier === tierKey;
            const isCurrent = tier === tierKey;
            const showPrice = tierKey !== 'free';
            const priceText = showPrice
              ? (billingPeriod === 'monthly'
                ? `${formatDual(tierInfo.priceMonthly)}/mo`
                : `${formatDual(tierInfo.priceMonthly * 6)}/yr`)
              : 'Free';
            
            return (
              <TouchableOpacity
                key={tierKey}
                style={[
                  styles.tierCard,
                  isSelected && styles.selectedTierCard,
                  isCurrent && styles.currentTierCard,
                ]}
                onPress={() => setSelectedTier(tierKey)}
                testID={`tier-${tierKey}`}
              >
                {tierInfo.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>MOST POPULAR</Text>
                  </View>
                )}
                
                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentText}>CURRENT</Text>
                  </View>
                )}

                <View style={styles.tierHeader}>
                  <Text style={[styles.tierName, { color: tierInfo.color }]}>
                    {tierInfo.name}
                  </Text>
                  <View style={styles.tierPricing}>
                    {tierKey !== 'free' && billingPeriod === 'yearly' && (
                      <View style={styles.offPill}>
                        <Text style={styles.offPillText}>-50%</Text>
                      </View>
                    )}
                    <Text style={styles.tierPrice}>{billingPeriod === 'monthly' && tierKey !== 'free' ? `${formatDual(tierInfo.priceMonthly)}/mo` : priceText}</Text>
                  </View>
                </View>

                <View style={styles.tierFeatures}>
                  {tierInfo.features.map((feature, index) => {
                    const IconComponent = feature.icon;
                    return (
                      <View key={index} style={styles.featureRow}>
                        <IconComponent 
                          size={16} 
                          color={feature.included ? Colors.success : Colors.text.light} 
                        />
                        <Text style={[
                          styles.featureText,
                          !feature.included && styles.disabledFeatureText
                        ]}>
                          {feature.text}
                        </Text>
                        {feature.included ? (
                          <Check size={16} color={Colors.success} />
                        ) : (
                          <X size={16} color={Colors.text.light} />
                        )}
                      </View>
                    );
                  })}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <GradientButton
            title={isProcessing ? 'Processing...' : `Upgrade to ${tierData[selectedTier].name}`}
            onPress={handleUpgrade}
            style={[styles.button, isProcessing && styles.disabledButton]}
            testID="upgrade-btn"
            disabled={isProcessing}
          />
          <View style={styles.disclaimerContainer}>
            <Text style={styles.disclaimer}>🔒 Secure payment powered by ArifPay. Your transaction is encrypted and protected.</Text>
          </View>
        </View>

        {/* Store section temporarily removed as requested */}
      </ScrollView>

      <Modal visible={showPromo} transparent animationType="fade" onRequestClose={() => setShowPromo(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <BadgePercent size={18} color={Colors.primary} />
              <Text style={styles.modalTitle}>Yearly Savings</Text>
            </View>
            <Text style={styles.modalBody}>Save 50% when you choose yearly billing. Lock in the best price and enjoy uninterrupted premium features all year long!</Text>
            <GradientButton title="Got it" onPress={() => setShowPromo(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PackCard({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.packCard} onPress={onPress} testID={`pack-${label.replace(/\s+/g,'-').toLowerCase()}`}>
      <Text style={styles.packLabel}>{label}</Text>
      <ArrowRight size={16} color={Colors.text.primary} />
    </TouchableOpacity>
  );
}

type ThemeCardProps = {
  id: string;
  name: string;
  type: 'gradient' | 'pattern';
  colors?: [string, string];
  onPress: () => void;
};

function ThemeCard({ id, name, type, colors, onPress }: ThemeCardProps) {
  return (
    <TouchableOpacity style={styles.themeCard} onPress={onPress} testID={`theme-${id}`}>
      {type === 'gradient' ? (
        <LinearGradient colors={(colors ?? (['#111827', '#0B1022'] as [string, string]))} style={styles.themePreview} />
      ) : (
        <View style={[styles.themePreview, styles.patternPreview]} />
      )}
      <Text style={styles.themeLabel}>{name}</Text>
    </TouchableOpacity>
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
  },
  closeButton: {
    alignSelf: 'flex-start',
  },
  content: {
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 30,
    marginHorizontal: 20,
    borderRadius: 20,
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.white,
    marginTop: 16,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: Colors.text.white,
    textAlign: 'center',
    opacity: 0.9,
  },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  phoneText: { color: Colors.text.white, fontWeight: '700', fontSize: 14 },
  badgesRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  bonusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  bonusText: { color: Colors.text.white, fontWeight: '700' },
  offBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  offText: { color: Colors.text.white, fontWeight: '700' },
  billingToggle: { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(255,255,255,0.2)', padding: 6, borderRadius: 999, marginTop: 14 },
  billingPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  billingPillActive: { backgroundColor: Colors.text.white },
  billingText: { color: Colors.text.white, fontWeight: '700' },
  billingTextActive: { color: Colors.text.primary },
  priceHighlight: { color: Colors.text.white, marginTop: 8, fontWeight: '700' },
  tiersSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  tierCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  selectedTierCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  currentTierCard: {
    borderColor: Colors.success,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: Colors.text.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  currentBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: Colors.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentText: {
    color: Colors.text.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  tierPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offPill: { backgroundColor: '#FFE8E8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  offPillText: { color: Colors.primary, fontWeight: '700', fontSize: 12 },
  tierPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  tierFeatures: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
  },
  disabledFeatureText: {
    color: Colors.text.light,
    textDecorationLine: 'line-through',
  },
  footer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  disclaimerContainer: {
    width: '100%',
  },
  disclaimer: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  storeSection: { paddingHorizontal: 20, paddingBottom: 30 },
  storeTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.primary, marginBottom: 12 },
  packsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  packCard: { flex: 1, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packLabel: { color: Colors.text.primary, fontWeight: '600' },
  themesRow: { flexDirection: 'row', gap: 10 },
  themeCard: { flex: 1, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, alignItems: 'center' },
  themePreview: { width: '100%', height: 80, borderRadius: 10, marginBottom: 8 },
  patternPreview: { backgroundColor: Colors.card, overflow: 'hidden' },
  themeLabel: { color: Colors.text.primary, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: Colors.background, borderRadius: 16, padding: 16, gap: 10 },
  modalHeader: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  modalTitle: { color: Colors.text.primary, fontWeight: '700', fontSize: 16 },
  modalBody: { color: Colors.text.secondary },
  securePaymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  securePaymentBadge: { backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  securePaymentText: { color: Colors.text.white, fontWeight: '700', fontSize: 13 },
});
