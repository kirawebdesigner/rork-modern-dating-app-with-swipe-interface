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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Check, Crown, Eye, Heart, Zap, MessageCircle, Filter, EyeOff, Star, BadgePercent, Phone, Shield, CreditCard, Calendar } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GradientButton from '@/components/GradientButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useMembership } from '@/hooks/membership-context';
import { useAuth } from '@/hooks/auth-context';
import { MembershipTier } from '@/types';
import { trpc } from '@/lib/trpc';
import * as WebBrowser from 'expo-web-browser';

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
  const { tier } = useMembership();
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<MembershipTier>('silver');
  const [billingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [showPromo, setShowPromo] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('CBE');

  const upgradeMutation = trpc.membership.upgrade.useMutation();

  const paymentMethods = [
    { id: 'CBE', name: 'CBE Bank', icon: CreditCard, description: 'Direct payment' },
    { id: 'TELEBIRR', name: 'TeleBirr', icon: Phone, description: 'Mobile wallet' },
    { id: 'AMOLE', name: 'Amole', icon: Phone, description: 'Mobile wallet' },
  ] as const;

  const handleUpgrade = async () => {
    try {
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

      setIsProcessing(true);
      console.log('[Premium] Upgrading to:', selectedTier);

      const result = await upgradeMutation.mutateAsync({
        userId: user.id,
        tier: selectedTier,
        paymentMethod: paymentMethod,
      });

      console.log('[Premium] Upgrade result:', result);

      if (result.testMode || !result.requiresPayment) {
        Alert.alert(
          'Success (Test Mode)',
          `Your membership has been upgraded to ${tierData[selectedTier].name}! This is test mode - no payment required. Please restart the app to see the changes.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      if (result.requiresPayment && 'paymentUrl' in result) {
        const paymentUrl = (result as any).paymentUrl as string | undefined;
        if (paymentUrl) {
          if (Platform.OS === 'web') {
            const newWindow = window.open(paymentUrl, '_blank', 'noopener,noreferrer');
          if (newWindow) {
            Alert.alert(
              'Payment Started',
              'Complete your payment in the new window. Your membership will be automatically updated after successful payment.',
              [{ text: 'OK', onPress: () => router.back() }]
            );
          } else {
            Alert.alert('Error', 'Please allow popups to complete payment.');
          }
          } else {
            const supported = await Linking.canOpenURL(paymentUrl);
            if (supported) {
              const webResult = await WebBrowser.openBrowserAsync(paymentUrl, {
              readerMode: false,
              enableBarCollapsing: true,
              showTitle: true,
            });
            
              if (webResult.type === 'cancel') {
                Alert.alert('Payment Cancelled', 'You cancelled the payment process.');
              } else if (webResult.type === 'dismiss') {
                Alert.alert(
                  'Payment Window Closed',
                  'Your membership will be automatically updated if payment was successful.',
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              }
            } else {
              Alert.alert('Error', 'Cannot open payment link. Please try again later.');
            }
          }
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      Alert.alert('Payment Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const USD_TO_ETB = 160;
  const formatETB = (amount: number) => `${amount * USD_TO_ETB} ETB`;
  const formatDual = useCallback((usdAmount: number) => formatETB(usdAmount), []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)/profile' as any); } }} style={styles.closeButton}>
          <X size={24} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          style={styles.heroSection}
        >
          <View style={styles.heroIcon}>
            <Crown size={48} color={Colors.text.white} strokeWidth={2.5} />
          </View>
          <Text style={styles.heroTitle}>Upgrade Your Experience</Text>
          <Text style={styles.heroSubtitle} testID="current-plan">Currently on {tierData[tier].name} plan</Text>

          <View style={styles.featuresBadges}>
            <View style={styles.featureBadge}>
              <Shield size={14} color={Colors.text.white} />
              <Text style={styles.featureBadgeText}>Secure Payment</Text>
            </View>
            <View style={styles.featureBadge}>
              <Calendar size={14} color={Colors.text.white} />
              <Text style={styles.featureBadgeText}>Cancel Anytime</Text>
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
                {tierInfo.popular ? (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>MOST POPULAR</Text>
                  </View>
                ) : null}
                
                {isCurrent ? (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentText}>CURRENT</Text>
                  </View>
                ) : null}

                <View style={styles.tierHeader}>
                  <Text style={[styles.tierName, { color: tierInfo.color }]}>
                    {tierInfo.name}
                  </Text>
                  <View style={styles.tierPricing}>
                    {tierKey !== 'free' && billingPeriod === 'yearly' ? (
                      <View style={styles.offPill}>
                        <Text style={styles.offPillText}>-50%</Text>
                      </View>
                    ) : null}
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

        <View style={styles.paymentMethodSection}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          {paymentMethods.map((method) => {
            const IconComponent = method.icon;
            const isSelected = paymentMethod === method.id;
            return (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentCard,
                  isSelected && styles.selectedPaymentCard,
                ]}
                onPress={() => setPaymentMethod(method.id)}
                testID={`payment-${method.id}`}
              >
                <View style={styles.paymentRow}>
                  <View style={styles.paymentIconBox}>
                    <IconComponent size={24} color={isSelected ? Colors.primary : Colors.text.secondary} />
                  </View>
                  <View style={styles.paymentTexts}>
                    <Text style={styles.paymentTitle}>{method.name}</Text>
                    <Text style={styles.paymentSubtitle}>{method.description}</Text>
                  </View>
                  {isSelected ? (
                    <View style={styles.checkmarkBox}>
                      <Check size={20} color={Colors.primary} />
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={styles.securityNote}>
            <Shield size={14} color={Colors.text.secondary} />
            <Text style={styles.securityNoteText}>All payments are secured by ArifPay</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <GradientButton
            title={isProcessing ? 'Processing...' : `Upgrade to ${tierData[selectedTier].name}`}
            onPress={handleUpgrade}
            style={[styles.button, isProcessing && styles.disabledButton]}
            testID="upgrade-btn"
            disabled={isProcessing}
          />
          <View style={styles.securityBadges}>
            <View style={styles.securityBadge}>
              <Shield size={14} color={Colors.text.secondary} />
              <Text style={styles.securityText}>Encrypted & Secure</Text>
            </View>
            <View style={styles.securityBadge}>
              <CreditCard size={14} color={Colors.text.secondary} />
              <Text style={styles.securityText}>Powered by ArifPay</Text>
            </View>
          </View>
          <Text style={styles.disclaimer}>Subscription renews monthly. Cancel anytime from settings.</Text>
        </View>

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
    paddingVertical: 40,
    marginHorizontal: 20,
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 4,
  },
  featuresBadges: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 20 
  },
  featureBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 999 
  },
  featureBadgeText: { 
    color: Colors.text.white, 
    fontWeight: '600', 
    fontSize: 12 
  },
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
  offPill: { 
    backgroundColor: '#FFE8E8', 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 8 
  },
  offPillText: { 
    color: Colors.primary, 
    fontWeight: '700', 
    fontSize: 12 
  },
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
    fontSize: 11,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  paymentMethodSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  paymentCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  selectedPaymentCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  paymentRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  paymentIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTexts: { 
    flex: 1 
  },
  paymentTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: Colors.text.primary,
    marginBottom: 2,
  },
  paymentSubtitle: { 
    fontSize: 13, 
    color: Colors.text.secondary 
  },
  checkmarkBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  securityNoteText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  securityBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityText: {
    fontSize: 11,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24 
  },
  modalCard: { 
    width: '100%', 
    maxWidth: 420, 
    backgroundColor: Colors.background, 
    borderRadius: 16, 
    padding: 16, 
    gap: 10 
  },
  modalHeader: { 
    flexDirection: 'row', 
    gap: 8, 
    alignItems: 'center' 
  },
  modalTitle: { 
    color: Colors.text.primary, 
    fontWeight: '700', 
    fontSize: 16 
  },
  modalBody: { 
    color: Colors.text.secondary 
  },
});
