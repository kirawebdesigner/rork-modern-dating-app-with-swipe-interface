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
import { X, Check, Crown, Eye, Heart, Zap, MessageCircle, Filter, EyeOff, Star, BadgePercent, Phone, Shield, CreditCard, Calendar } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GradientButton from '@/components/GradientButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useMembership } from '@/hooks/membership-context';
import { useAuth } from '@/hooks/auth-context';
import { MembershipTier } from '@/types';
import * as WebBrowser from 'expo-web-browser';
import { trpc } from '@/lib/trpc';
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
    priceMonthly: 500,
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
    priceMonthly: 1500,
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
    priceMonthly: 2600,
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
  const { tier, upgradeTier } = useMembership();
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<MembershipTier>('silver');
  const [billingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [showPromo, setShowPromo] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('CBE');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  const createPaymentDirectly = async (userId: string, tierName: string, amount: number, phone: string, method: string) => {
    console.log('[Premium] Creating payment directly via ArifPay...');
    
    const sessionId = `pay_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const baseUrl = 'https://01sqivqojn0aq61khqyvn.rork.app';
    
    // Normalize phone number
    let normalizedPhone = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '251' + normalizedPhone.substring(1);
    } else if (normalizedPhone.startsWith('+251')) {
      normalizedPhone = normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('251') && normalizedPhone.length === 9) {
      normalizedPhone = '251' + normalizedPhone;
    }
    
    const expireDate = new Date();
    expireDate.setHours(expireDate.getHours() + 24);
    const expireDateStr = expireDate.toISOString().split('.')[0];
    
    const payload = {
      phone: normalizedPhone,
      email: `${userId}@app.com`,
      nonce: sessionId,
      cancelUrl: `${baseUrl}/payment-cancel`,
      errorUrl: `${baseUrl}/payment-error`,
      notifyUrl: `${baseUrl}/api/webhooks/arifpay`,
      successUrl: `${baseUrl}/payment-success?tier=${tierName}&session=${sessionId}`,
      paymentMethods: ['CBE'],
      expireDate: expireDateStr,
      items: [
        {
          name: `${tierName.charAt(0).toUpperCase() + tierName.slice(1)} Membership`,
          quantity: 1,
          price: amount,
          description: `Premium ${tierName} membership subscription`,
          image: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300"
        },
      ],
      beneficiaries: [
        {
          accountNumber: "1000000000000",
          bank: "AWINETAA",
          amount: amount
        },
      ],
      lang: "EN"
    };
    
    console.log('[Premium] Direct payment payload:', JSON.stringify(payload, null, 2));
    
    try {
      const response = await fetch('https://gateway.arifpay.net/api/checkout/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-arifpay-key': 'hxsMUuBvV4j3ONdDif4SRSo2cKPrMoWY',
        },
        body: JSON.stringify(payload),
      });
      
      const responseText = await response.text();
      console.log('[Premium] ArifPay response:', responseText.substring(0, 500));
      
      if (responseText.startsWith('<')) {
        throw new Error('Payment service returned an unexpected response. Please try again.');
      }
      
      const result = JSON.parse(responseText);
      
      if (result.error === false && result.data?.paymentUrl) {
        // Store transaction in database
        await supabase
          .from('payment_transactions')
          .insert({
            user_id: userId,
            session_id: result.data.sessionId || sessionId,
            amount,
            tier: tierName,
            payment_method: method,
            status: 'pending',
          });
        
        return {
          paymentUrl: result.data.paymentUrl,
          sessionId: result.data.sessionId || sessionId,
        };
      } else {
        throw new Error(result.msg || 'Failed to create payment session');
      }
    } catch (err: any) {
      console.error('[Premium] Direct payment error:', err);
      throw new Error(err.message || 'Payment service unavailable');
    }
  };

  const upgradeMutation = trpc.membership.upgrade.useMutation({
    retry: 1,
    retryDelay: 500,
    onSuccess: async (data) => {
      console.log('[Premium] Upgrade mutation success:', data);
      
      if (data.requiresPayment && data.paymentUrl) {
        console.log('[Premium] Opening payment URL:', data.paymentUrl);
        setIsProcessing(false);
        
        try {
          const result = await WebBrowser.openBrowserAsync(data.paymentUrl, {
            dismissButtonStyle: 'close',
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          });
          console.log('[Premium] Browser result:', result);
        } catch (err) {
          console.error('[Premium] Failed to open browser:', err);
          Linking.openURL(data.paymentUrl);
        }
      } else if (!data.requiresPayment) {
        await upgradeTier(selectedTier);
        Alert.alert(
          'Success!',
          `Your membership has been upgraded to ${tierData[selectedTier].name}!`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
        setIsProcessing(false);
      }
    },
    onError: async (error) => {
      console.error('[Premium] Upgrade mutation error:', error);
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
        console.log('[Premium] Network error, trying direct upgrade...');
        
        try {
          const amount = tierData[selectedTier].priceMonthly;
          
          if (amount === 0) {
            await upgradeTier(selectedTier);
            setIsProcessing(false);
            Alert.alert('Success!', `Your membership has been upgraded to ${tierData[selectedTier].name}!`, 
              [{ text: 'OK', onPress: () => router.back() }]);
            return;
          }
          
          const payment = await createPaymentDirectly(
            user!.id,
            selectedTier,
            amount,
            phoneNumber,
            paymentMethod
          );
          
          setIsProcessing(false);
          
          try {
            await WebBrowser.openBrowserAsync(payment.paymentUrl, {
              dismissButtonStyle: 'close',
              presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
            });
          } catch {
            Linking.openURL(payment.paymentUrl);
          }
          return;
        } catch (fallbackErr) {
          console.error('[Premium] Fallback also failed:', fallbackErr);
        }
      }
      
      setIsProcessing(false);
      
      let errorMessage = 'Failed to process upgrade. Please try again.';
      
      if (error.message) {
        if (error.message.includes('<!DOCTYPE') || error.message.includes('<html')) {
          errorMessage = 'Server error. Please try again later.';
        } else if (!error.message.includes('Failed to fetch')) {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Upgrade Failed', errorMessage);
    },
  });

  const paymentMethods = [
    { id: 'CBE', name: 'CBE Birr', icon: CreditCard, description: 'Direct bank payment' },
  ] as const;

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

    setShowPhoneModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Phone Required', 'Please enter your phone number to proceed with payment.');
      return;
    }

    setShowPhoneModal(false);
    setIsProcessing(true);
    console.log('[Premium] Upgrading to:', selectedTier);
    console.log('[Premium] Phone:', phoneNumber);
    console.log('[Premium] Payment method:', paymentMethod);

    const amount = tierData[selectedTier].priceMonthly;
    
    if (amount === 0) {
      await upgradeTier(selectedTier);
      setIsProcessing(false);
      Alert.alert('Success!', `Your membership has been upgraded to ${tierData[selectedTier].name}!`,
        [{ text: 'OK', onPress: () => router.back() }]);
      return;
    }

    // Try direct payment first for reliability
    try {
      console.log('[Premium] Using direct payment method...');
      const payment = await createPaymentDirectly(
        user!.id,
        selectedTier,
        amount,
        phoneNumber,
        paymentMethod
      );
      
      setIsProcessing(false);
      
      try {
        await WebBrowser.openBrowserAsync(payment.paymentUrl, {
          dismissButtonStyle: 'close',
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });
      } catch {
        Linking.openURL(payment.paymentUrl);
      }
    } catch (directErr: any) {
      console.error('[Premium] Direct payment failed, trying tRPC...', directErr);
      
      // Fallback to tRPC
      upgradeMutation.mutate({
        userId: user!.id,
        tier: selectedTier,
        paymentMethod,
        phone: phoneNumber,
      });
    }
  };

  const formatETB = (amount: number) => `${amount.toLocaleString()} ETB`;
  const formatDual = useCallback((etbAmount: number) => formatETB(etbAmount), []);

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
                : `${formatDual(Math.round(tierInfo.priceMonthly * 6 * 0.5))}/yr`)
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

      <Modal visible={showPhoneModal} transparent animationType="slide" onRequestClose={() => setShowPhoneModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.phoneModalCard}>
            <View style={styles.phoneModalHeader}>
              <Text style={styles.phoneModalTitle}>Enter Phone Number</Text>
              <TouchableOpacity onPress={() => setShowPhoneModal(false)} style={styles.phoneModalClose}>
                <X size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.phoneModalSubtitle}>
              Enter your phone number to proceed with {paymentMethod} payment for {tierData[selectedTier].name} membership.
            </Text>
            
            <View style={styles.phoneInputContainer}>
              <Text style={styles.phonePrefix}>+251</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="9XXXXXXXX"
                placeholderTextColor={Colors.text.light}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                maxLength={10}
              />
            </View>
            
            <View style={styles.paymentSummary}>
              <Text style={styles.summaryLabel}>Plan:</Text>
              <Text style={styles.summaryValue}>{tierData[selectedTier].name}</Text>
            </View>
            <View style={styles.paymentSummary}>
              <Text style={styles.summaryLabel}>Amount:</Text>
              <Text style={styles.summaryValue}>{formatETB(tierData[selectedTier].priceMonthly)}</Text>
            </View>
            <View style={styles.paymentSummary}>
              <Text style={styles.summaryLabel}>Payment:</Text>
              <Text style={styles.summaryValue}>{paymentMethod}</Text>
            </View>
            
            <GradientButton
              title={isProcessing ? 'Processing...' : 'Proceed to Payment'}
              onPress={handleConfirmPayment}
              style={styles.confirmButton}
              disabled={isProcessing}
            />
            
            <TouchableOpacity onPress={() => setShowPhoneModal(false)} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
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
  phoneModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.background,
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
    fontWeight: '700',
    color: Colors.text.primary,
  },
  phoneModalClose: {
    padding: 4,
  },
  phoneModalSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  phonePrefix: {
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    paddingVertical: 14,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text.primary,
  },
  paymentSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  confirmButton: {
    marginTop: 20,
  },
  cancelButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
});
