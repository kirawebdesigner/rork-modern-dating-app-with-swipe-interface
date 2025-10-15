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
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Check, Crown, Eye, Heart, Zap, MessageCircle, Filter, EyeOff, Star, ArrowRight, Info, BadgePercent, Phone } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GradientButton from '@/components/GradientButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useMembership } from '@/hooks/membership-context';
import { MembershipTier, ThemeId } from '@/types';
import { useApp } from '@/hooks/app-context';

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
    priceMonthly: 9.99,
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
    priceMonthly: 19.99,
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
    priceMonthly: 29.99,
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
      console.log('[Premium] Upgrade pressed', selectedTier);
      Alert.alert(
        'Choose Payment Method',
        'Select how you want to pay',
        [
          {
            text: 'Arifpay (Automatic)',
            onPress: () => router.push({ pathname: '/arifpay-checkout', params: { tier: selectedTier } } as any),
          },
          {
            text: 'Manual Payment',
            onPress: () => router.push({ pathname: '/payment-verification', params: { tier: selectedTier } } as any),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
    } catch (e) {
      console.error('[Premium] handleUpgrade nav error', (e as any)?.message || e);
      Alert.alert('Navigation failed', 'Please try again.');
    }
  };

  const onBuyPack = async (type: 'superLikes' | 'boosts' | 'compliments', amount: number) => {
    await addCredits(type as any, amount);
    Alert.alert('Purchased', `Added ${amount} ${type}.`);
  };


  const USD_TO_ETB = 160;
  const formatUSD = (amount: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount);
  const formatETB = (amount: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'ETB', maximumFractionDigits: 0 }).format(amount);
  const formatDual = useCallback((usdAmount: number) => `${formatUSD(usdAmount)} • ${formatETB(usdAmount * USD_TO_ETB)}`, []);

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
          <Text style={styles.heroSubtitle} testID="current-plan">
            Current plan: {tierData[tier].name}
          </Text>
          {userPhone && (
            <View style={styles.phoneRow}>
              <Phone size={14} color={Colors.text.white} />
              <Text style={styles.phoneText}>{userPhone}</Text>
            </View>
          )}
          <View style={styles.badgesRow}>
            <View style={styles.bonusBadge}>
              <Info size={14} color={Colors.text.white} />
              <Text style={styles.bonusText}>Manual Telebirr supported</Text>
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
          <View style={styles.telebirrRow}>
            <Image source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/bdshjzcr8c9zb8mhnshfy' }} style={styles.telebirrLogo} resizeMode="contain" />
            <Text style={styles.telebirrText}>Pay via Telebirr 0944120739 (Tesnim meftuh)</Text>
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
                  <Text style={[styles.tierName, { color: tierInfo.color }]}>\
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
            title={`Upgrade to ${tierData[selectedTier].name}`}
            onPress={handleUpgrade}
            style={styles.button}
            testID="upgrade-btn"
          />
          <Text style={styles.disclaimer}>
            Choose between automatic payment (Arifpay) or manual payment (Telebirr).
          </Text>
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
            <Text style={styles.modalBody}>Save 50% on yearly plans and get a 1st Month Bonus automatically.</Text>
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
  telebirrRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  telebirrLogo: { width: 28, height: 28, borderRadius: 6, backgroundColor: 'white' },
  telebirrText: { color: Colors.text.white, fontWeight: '700' },
});
