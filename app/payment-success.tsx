import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle, AlertCircle, Crown } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GradientButton from '@/components/GradientButton';
import { useAuth } from '@/hooks/auth-context';
import { useMembership } from '@/hooks/membership-context';
import { trpc } from '@/lib/trpc';
import { MembershipTier } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { reloadProfile } = useAuth();
  const { upgradeTier } = useMembership();
  const params = useLocalSearchParams();
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : undefined;
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [upgradedTier, setUpgradedTier] = useState<string | null>(null);

  const verifyQuery = trpc.payment.verify.useQuery(
    { sessionId: sessionId! }, 
    { 
      enabled: !!sessionId,
      retry: 3,
      retryDelay: 1000,
    }
  );

  useEffect(() => {
    const syncMembership = async (tier: MembershipTier) => {
      console.log('[PaymentSuccess] Syncing membership to tier:', tier);
      try {
        await upgradeTier(tier);
        await AsyncStorage.setItem('membership_tier', JSON.stringify(tier));
        console.log('[PaymentSuccess] Membership synced successfully');
      } catch (err) {
        console.error('[PaymentSuccess] Failed to sync membership:', err);
      }
    };

    if (sessionId) {
      if (verifyQuery.data?.success) {
        console.log('[PaymentSuccess] Payment verified:', verifyQuery.data);
        setVerified(true);
        setIsVerifying(false);
        
        const amount = verifyQuery.data.amount || 0;
        let tier: MembershipTier = 'free';
        if (amount >= 2600) tier = 'vip';
        else if (amount >= 1500) tier = 'gold';
        else if (amount >= 500) tier = 'silver';
        
        setUpgradedTier(tier);
        syncMembership(tier);
        reloadProfile().catch(console.error);
      } else if (verifyQuery.error) {
        console.error('[PaymentSuccess] Verification error:', verifyQuery.error);
        setIsVerifying(false);
      }
    } else {
      setIsVerifying(false);
      setVerified(true);
      reloadProfile().catch(console.error);
    }
  }, [sessionId, verifyQuery.data, verifyQuery.error, reloadProfile, upgradeTier]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {isVerifying ? (
          <>
            <ActivityIndicator size="large" color={Colors.primary} style={styles.iconContainer} />
            <Text style={styles.title}>Verifying Payment...</Text>
            <Text style={styles.subtitle}>Please wait while we confirm your transaction.</Text>
          </>
        ) : verified ? (
          <>
            <View style={styles.successIconContainer}>
              <View style={styles.successIconBg}>
                <Crown size={48} color="#FFD700" />
              </View>
              <View style={styles.checkBadge}>
                <CheckCircle size={28} color={Colors.success} fill={Colors.background} />
              </View>
            </View>
            <Text style={styles.title}>Payment Successful!</Text>
            {upgradedTier && upgradedTier !== 'free' ? (
              <Text style={styles.tierText}>
                Welcome to {upgradedTier.charAt(0).toUpperCase() + upgradedTier.slice(1)}!
              </Text>
            ) : null}
            <Text style={styles.subtitle}>
              Your membership has been upgraded. You can now enjoy all the premium features.
            </Text>
            <View style={styles.featuresList}>
              <Text style={styles.featureItem}>✓ Increased daily messages</Text>
              <Text style={styles.featureItem}>✓ More swipes & profile views</Text>
              <Text style={styles.featureItem}>✓ Premium filters & features</Text>
            </View>
            <GradientButton
              title="Start Exploring"
              onPress={() => router.replace('/(tabs)' as any)}
              style={styles.button}
            />
          </>
        ) : (
          <>
            <View style={styles.iconContainer}>
              <AlertCircle size={80} color={Colors.error} />
            </View>
            <Text style={styles.title}>Verification Failed</Text>
            <Text style={styles.subtitle}>
              We couldn&apos;t verify your payment immediately. If you paid, your account will be upgraded shortly via our background system.
            </Text>
            <GradientButton
              title="Go to Profile"
              onPress={() => router.replace('/(tabs)/profile' as any)}
              style={styles.button}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    width: '100%',
  },
  successIconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  successIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.background,
    borderRadius: 20,
  },
  tierText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 8,
  },
  featuresList: {
    alignSelf: 'stretch',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  featureItem: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
});
