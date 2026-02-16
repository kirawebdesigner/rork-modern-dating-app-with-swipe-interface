import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  Linking,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { safeGoBack } from '@/lib/navigation';
import { X, Check, Crown, Eye, Heart, Zap, MessageCircle, Filter, EyeOff, Star, Shield, Calendar, ChevronDown, Sparkles } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GradientButton from '@/components/GradientButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useMembership } from '@/hooks/membership-context';
import { useAuth } from '@/hooks/auth-context';
import { trpc } from '@/lib/trpc';
import { MembershipTier } from '@/types';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TierFeature {
  icon: any;
  text: string;
  included: boolean;
}

type BillingPeriod = 'monthly' | '6month' | 'annual';

interface TierInfo {
  name: string;
  priceMonthly: number;
  color: string;
  gradient: string[];
  popular?: boolean;
  features: TierFeature[];
}

const BILLING_OPTIONS: { key: BillingPeriod; label: string; months: number; discount: number; tag?: string }[] = [
  { key: 'monthly', label: '1 Month', months: 1, discount: 0 },
  { key: '6month', label: '6 Months', months: 6, discount: 0.25, tag: '25% OFF' },
  { key: 'annual', label: '1 Year', months: 12, discount: 0.40, tag: '40% OFF' },
];

const getBillingPrice = (monthlyPrice: number, period: BillingPeriod): number => {
  const option = BILLING_OPTIONS.find(o => o.key === period)!;
  const total = monthlyPrice * option.months;
  return Math.round(total * (1 - option.discount));
};

const getPerMonthPrice = (monthlyPrice: number, period: BillingPeriod): number => {
  const option = BILLING_OPTIONS.find(o => o.key === period)!;
  const total = getBillingPrice(monthlyPrice, period);
  return Math.round(total / option.months);
};

const tierData: Record<MembershipTier, TierInfo> = {
  free: {
    name: 'Free',
    priceMonthly: 0,
    color: '#9CA3AF',
    gradient: ['#F3F4F6', '#F3F4F6'],
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
    priceMonthly: 500,
    color: '#94A3B8',
    gradient: ['#94A3B8', '#64748B'],
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
    priceMonthly: 1500,
    color: '#F59E0B',
    gradient: ['#FCD34D', '#F59E0B'],
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
    priceMonthly: 2600,
    color: '#7C3AED',
    gradient: ['#A78BFA', '#7C3AED'],
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
  const { tier, upgradeTier } = useMembership();
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<MembershipTier>(tier === 'free' ? 'gold' : tier);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const normalizePhone = (phone: string): string => {
    let normalized = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    if (normalized.startsWith('+')) normalized = normalized.substring(1);
    if (normalized.startsWith('0')) normalized = '251' + normalized.substring(1);
    else if (!normalized.startsWith('251') && normalized.length === 9) normalized = '251' + normalized;
    return normalized;
  };

  const validatePhone = (phone: string): boolean => {
    const normalized = normalizePhone(phone);
    return normalized.length === 12 && normalized.startsWith('251');
  };

  const upgradeMutation = trpc.membership.upgrade.useMutation();

  const handleUpgrade = async () => {
    if (!user?.id) {
      Alert.alert('Authentication Required', 'Please log in to upgrade your membership.');
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

    const amount = tierData[selectedTier].priceMonthly;
    if (amount === 0) {
      await upgradeTier(selectedTier);
      Alert.alert('Success!', `Your membership has been updated to ${tierData[selectedTier].name}!`,
        [{ text: 'OK', onPress: () => router.back() }]);
      return;
    }

    setPhoneNumber('');
    setPhoneError('');
    setShowPhoneModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!validatePhone(phoneNumber)) {
      setPhoneError('Please enter a valid Ethiopian phone number (e.g., 09xxxxxxxx)');
      return;
    }

    setPhoneError('');
    setShowPhoneModal(false);
    setIsProcessing(true);

    try {
      const billingOpt = BILLING_OPTIONS.find(o => o.key === billingPeriod)!;
      const totalAmount = getBillingPrice(tierData[selectedTier].priceMonthly, billingPeriod);
      console.log(`[Premium] Initiating ${selectedTier} upgrade for ${user?.id} with phone ${phoneNumber}, amount: ${totalAmount}, months: ${billingOpt.months}`);

      const result = await upgradeMutation.mutateAsync({
        userId: user!.id,
        tier: selectedTier,
        phone: normalizePhone(phoneNumber),
        paymentMethod: 'TELEBIRR',
        amount: totalAmount,
        billingMonths: billingOpt.months,
      });

      setIsProcessing(false);

      if (result.success && result.requiresPayment && result.paymentUrl) {
        console.log('[Premium] Redirecting to:', result.paymentUrl);
        if (result.sessionId) {
          await AsyncStorage.setItem('pending_payment_session', result.sessionId);
          await AsyncStorage.setItem('pending_payment_tier', selectedTier);
        }
        Linking.openURL(result.paymentUrl);
        Alert.alert('Payment', 'Redirecting to payment page. You will receive a confirmation on your phone.', [{ text: 'OK' }]);
      } else if (result.success && !result.requiresPayment) {
        await upgradeTier(selectedTier);
        Alert.alert('Success!', `Your membership has been upgraded to ${tierData[selectedTier].name}!`,
          [{ text: 'OK', onPress: () => router.back() }]);
      } else {
        throw new Error('Failed to create payment session from server');
      }
    } catch (error: any) {
      setIsProcessing(false);
      console.error('[Premium] Upgrade error:', error);
      Alert.alert('Upgrade Failed', error.message || 'Failed to initiate upgrade. Please try again.');
    }
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      console.log('[Premium] Cancelling subscription for user:', user?.id);

      if (user?.id) {
        const { error } = await supabase
          .from('memberships')
          .update({
            tier: 'free',
            expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) {
          console.log('[Premium] Cancel error from server:', error.message);
        }
      }

      await upgradeTier('free');
      await AsyncStorage.setItem('membership_tier', JSON.stringify('free'));

      setShowCancelModal(false);
      Alert.alert(
        'Subscription Cancelled',
        'Your subscription has been cancelled. You are now on the Free plan. You can upgrade again anytime.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('[Premium] Cancel error:', error);
      Alert.alert('Error', 'Failed to cancel subscription. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const formatETB = (amount: number) => `${amount.toLocaleString()} ETB`;

  const selectedBillingOption = BILLING_OPTIONS.find(o => o.key === billingPeriod)!;
  const selectedTotalPrice = selectedTier !== 'free' ? getBillingPrice(tierData[selectedTier].priceMonthly, billingPeriod) : 0;
  const selectedPerMonth = selectedTier !== 'free' ? getPerMonthPrice(tierData[selectedTier].priceMonthly, billingPeriod) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack(router, '/(tabs)/profile')} style={styles.closeButton}>
          <X size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['#FF2D55', '#FF6B8A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBg}
          >
            <View style={styles.heroIcon}>
              <Crown size={36} color="#FFF" strokeWidth={2.5} />
            </View>
            <Text style={styles.heroTitle}>Unlock Premium</Text>
            <Text style={styles.heroSubtitle}>
              {tier === 'free' ? 'Get unlimited access to all features' : `Currently on ${tierData[tier].name} plan`}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.billingSection}>
          <Text style={styles.sectionTitle}>Choose billing</Text>
          <View style={styles.billingRow}>
            {BILLING_OPTIONS.map((opt) => {
              const isActive = billingPeriod === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.billingCard, isActive && styles.billingCardActive]}
                  onPress={() => setBillingPeriod(opt.key)}
                  activeOpacity={0.7}
                  testID={`billing-${opt.key}`}
                >
                  {opt.tag ? (
                    <View style={[styles.billingTag, opt.key === 'annual' && styles.billingTagBest]}>
                      <Text style={styles.billingTagText}>{opt.tag}</Text>
                    </View>
                  ) : null}
                  <Text style={[styles.billingLabel, isActive && styles.billingLabelActive]}>{opt.label}</Text>
                  {opt.discount > 0 ? (
                    <Text style={[styles.billingDiscount, isActive && styles.billingDiscountActive]}>
                      Save {Math.round(opt.discount * 100)}%
                    </Text>
                  ) : (
                    <Text style={[styles.billingDiscount, isActive && styles.billingDiscountActive]}>Standard</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.tiersSection}>
          <Text style={styles.sectionTitle}>Choose plan</Text>
          {(Object.keys(tierData) as MembershipTier[]).filter(k => k !== 'free').map((tierKey) => {
            const tierInfo = tierData[tierKey];
            const isSelected = selectedTier === tierKey;
            const isCurrent = tier === tierKey;
            const totalPrice = getBillingPrice(tierInfo.priceMonthly, billingPeriod);
            const perMonth = getPerMonthPrice(tierInfo.priceMonthly, billingPeriod);
            const billingOpt = BILLING_OPTIONS.find(o => o.key === billingPeriod)!;

            return (
              <TouchableOpacity
                key={tierKey}
                style={[styles.tierCard, isSelected && styles.selectedTierCard]}
                onPress={() => setSelectedTier(tierKey)}
                testID={`tier-${tierKey}`}
                activeOpacity={0.7}
              >
                {tierInfo.popular && (
                  <View style={styles.popularBadge}>
                    <Sparkles size={10} color="#FFF" />
                    <Text style={styles.popularText}>POPULAR</Text>
                  </View>
                )}

                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentText}>CURRENT</Text>
                  </View>
                )}

                <View style={styles.tierHeader}>
                  <View style={styles.tierNameRow}>
                    <LinearGradient
                      colors={tierInfo.gradient as [string, string]}
                      style={styles.tierDot}
                    />
                    <Text style={styles.tierName}>{tierInfo.name}</Text>
                  </View>
                  <View style={styles.tierPricing}>
                    {billingOpt.discount > 0 && (
                      <View style={styles.offPill}>
                        <Text style={styles.offPillText}>-{Math.round(billingOpt.discount * 100)}%</Text>
                      </View>
                    )}
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.tierPrice}>{formatETB(perMonth)}<Text style={styles.tierPriceUnit}>/mo</Text></Text>
                      {billingPeriod !== 'monthly' && (
                        <Text style={styles.tierTotalPrice}>{formatETB(totalPrice)} total</Text>
                      )}
                    </View>
                  </View>
                </View>

                {billingOpt.discount > 0 && (
                  <View style={styles.savingsBanner}>
                    <Text style={styles.savingsText}>
                      Save {formatETB(tierInfo.priceMonthly * billingOpt.months - totalPrice)}
                    </Text>
                  </View>
                )}

                {isSelected && (
                  <View style={styles.tierFeatures}>
                    {tierInfo.features.map((feature, index) => {
                      const IconComponent = feature.icon;
                      return (
                        <View key={index} style={styles.featureRow}>
                          <View style={[styles.featureCheck, feature.included ? styles.featureCheckActive : styles.featureCheckDisabled]}>
                            {feature.included ? (
                              <Check size={12} color="#FFF" strokeWidth={3} />
                            ) : (
                              <X size={12} color="#9CA3AF" strokeWidth={2} />
                            )}
                          </View>
                          <Text style={[styles.featureText, !feature.included && styles.disabledFeatureText]}>
                            {feature.text}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <GradientButton
            title={isProcessing ? 'Processing...' : `Upgrade to ${tierData[selectedTier].name} — ${formatETB(selectedTotalPrice)}`}
            onPress={handleUpgrade}
            style={StyleSheet.flatten([styles.button, isProcessing && styles.disabledButton])}
            testID="upgrade-btn"
            disabled={isProcessing}
          />

          {tier !== 'free' && (
            <TouchableOpacity
              style={styles.cancelPlanBtn}
              onPress={() => setShowCancelModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelPlanText}>Cancel current plan</Text>
            </TouchableOpacity>
          )}

          <View style={styles.securityBadges}>
            <View style={styles.securityBadge}>
              <Shield size={13} color="#9CA3AF" />
              <Text style={styles.securityText}>Encrypted & Secure</Text>
            </View>
            <View style={styles.securityBadge}>
              <Shield size={13} color="#9CA3AF" />
              <Text style={styles.securityText}>Powered by ArifPay</Text>
            </View>
          </View>
          <Text style={styles.disclaimer}>
            {billingPeriod === 'monthly' ? 'Renews monthly.' : billingPeriod === '6month' ? 'Renews every 6 months.' : 'Renews annually.'} Cancel anytime from settings.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={showPhoneModal} transparent animationType="slide" onRequestClose={() => setShowPhoneModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.phoneModalCard}>
            <View style={styles.phoneModalHeader}>
              <Text style={styles.phoneModalTitle}>Payment Details</Text>
              <TouchableOpacity onPress={() => setShowPhoneModal(false)} style={styles.phoneModalClose}>
                <X size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.phoneModalSubtitle}>
              Enter your phone number to receive payment confirmation.
            </Text>

            <View style={styles.phoneInputContainer}>
              <Text style={styles.phonePrefix}>+251</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="9xxxxxxxx"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(text.replace(/[^0-9]/g, ''));
                  setPhoneError('');
                }}
                maxLength={10}
              />
            </View>

            {phoneError ? (
              <Text style={styles.phoneErrorText}>{phoneError}</Text>
            ) : null}

            <View style={styles.summaryCard}>
              <View style={styles.paymentSummary}>
                <Text style={styles.summaryLabel}>Plan</Text>
                <Text style={styles.summaryValue}>{tierData[selectedTier].name}</Text>
              </View>
              <View style={styles.paymentSummary}>
                <Text style={styles.summaryLabel}>Period</Text>
                <Text style={styles.summaryValue}>{selectedBillingOption.label}</Text>
              </View>
              {selectedBillingOption.discount > 0 && (
                <View style={styles.paymentSummary}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={[styles.summaryValue, { color: '#22C55E' }]}>-{Math.round(selectedBillingOption.discount * 100)}%</Text>
                </View>
              )}
              <View style={[styles.paymentSummary, styles.paymentSummaryTotal]}>
                <Text style={styles.summaryLabelTotal}>Total</Text>
                <Text style={styles.summaryValueTotal}>{selectedTotalPrice.toLocaleString()} ETB</Text>
              </View>
            </View>

            <GradientButton
              title="Continue to Payment"
              onPress={handleConfirmPayment}
              style={styles.confirmButton}
            />

            <TouchableOpacity onPress={() => setShowPhoneModal(false)} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCancelModal} transparent animationType="fade" onRequestClose={() => setShowCancelModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.cancelModalCard}>
            <Text style={styles.cancelModalTitle}>Cancel Subscription?</Text>
            <Text style={styles.cancelModalBody}>
              You will lose access to all {tierData[tier].name} features including unlimited swipes, messages, and premium filters. Your plan will be downgraded to Free immediately.
            </Text>

            <TouchableOpacity
              style={styles.cancelConfirmBtn}
              onPress={handleCancelSubscription}
              disabled={isCancelling}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelConfirmText}>
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel My Plan'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.keepPlanBtn}
              onPress={() => setShowCancelModal(false)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FF2D55', '#FF6B8A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.keepPlanGradient}
              >
                <Text style={styles.keepPlanText}>Keep My Plan</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1A1A1A',
  },
  content: {
    paddingBottom: 40,
  },
  heroSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  heroBg: {
    alignItems: 'center',
    paddingVertical: 32,
    borderRadius: 24,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#FFF',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  billingSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginBottom: 12,
  },
  billingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  billingCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0F0F0',
    position: 'relative',
    overflow: 'visible',
  },
  billingCardActive: {
    borderColor: '#FF2D55',
    backgroundColor: '#FFF5F7',
  },
  billingTag: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#22C55E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  billingTagBest: {
    backgroundColor: '#FF6B00',
  },
  billingTagText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800' as const,
  },
  billingLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginBottom: 2,
  },
  billingLabelActive: {
    color: '#FF2D55',
  },
  billingDiscount: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500' as const,
  },
  billingDiscountActive: {
    color: '#FF2D55',
  },
  tiersSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  tierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    position: 'relative',
  },
  selectedTierCard: {
    borderColor: '#FF2D55',
    backgroundColor: '#FFFFFF',
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 18,
    backgroundColor: '#FF2D55',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  popularText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800' as const,
  },
  currentBadge: {
    position: 'absolute',
    top: -10,
    right: 18,
    backgroundColor: '#22C55E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  currentText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800' as const,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tierName: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#1A1A1A',
  },
  tierPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offPill: {
    backgroundColor: '#FFE5EA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  offPillText: {
    color: '#FF2D55',
    fontWeight: '700' as const,
    fontSize: 11,
  },
  tierPrice: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#1A1A1A',
  },
  tierPriceUnit: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#9CA3AF',
  },
  tierTotalPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500' as const,
  },
  savingsBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  savingsText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  tierFeatures: {
    gap: 8,
    marginTop: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCheckActive: {
    backgroundColor: '#22C55E',
  },
  featureCheckDisabled: {
    backgroundColor: '#F0F0F0',
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500' as const,
  },
  disabledFeatureText: {
    color: '#9CA3AF',
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
  cancelPlanBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  cancelPlanText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  securityBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  securityText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500' as const,
  },
  disclaimer: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  phoneModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
  },
  phoneModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phoneModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1A1A1A',
  },
  phoneModalClose: {
    padding: 4,
  },
  phoneModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 16,
  },
  phonePrefix: {
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1A1A1A',
    borderRightWidth: 1,
    borderRightColor: '#F0F0F0',
    paddingVertical: 14,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A1A',
  },
  phoneErrorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  paymentSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  paymentSummaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    marginTop: 8,
    paddingTop: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1A1A1A',
  },
  summaryLabelTotal: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1A1A1A',
  },
  summaryValueTotal: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#1A1A1A',
  },
  confirmButton: {
    marginTop: 4,
  },
  cancelButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500' as const,
  },
  cancelModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  cancelModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginBottom: 12,
  },
  cancelModalBody: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  cancelConfirmBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelConfirmText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
  keepPlanBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  keepPlanGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  keepPlanText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFF',
  },
});
