import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { X, CreditCard, CheckCircle, XCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GradientButton from '@/components/GradientButton';
import { trpc } from '@/lib/trpc';
import type { MembershipTier } from '@/types';

type PaymentStatus = 'idle' | 'creating' | 'pending' | 'verifying' | 'completed' | 'failed';

export default function ArifpayCheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tier = params.tier as MembershipTier;
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [sessionId, setSessionId] = useState<string>('');
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  const createCheckoutMutation = trpc.payment.createCheckout.useMutation({
    onSuccess: (data) => {
      console.log('[Arifpay] Checkout created:', data);
      setSessionId(data.sessionId);
      setCheckoutUrl(data.checkoutUrl);
      setStatus('pending');
      openCheckout(data.checkoutUrl);
    },
    onError: (err) => {
      console.error('[Arifpay] Checkout creation error:', err);
      setError(err.message || 'Failed to create checkout');
      setStatus('failed');
    },
  });

  const verifyPaymentQuery = trpc.payment.verify.useQuery(
    { sessionId },
    {
      enabled: status === 'verifying' && !!sessionId,
      refetchInterval: 3000,
    }
  );

  useEffect(() => {
    if (verifyPaymentQuery.data) {
      console.log('[Arifpay] Verification data:', verifyPaymentQuery.data);
      if (verifyPaymentQuery.data.success) {
        setStatus('completed');
      } else if (verifyPaymentQuery.data.status === 'failed' || verifyPaymentQuery.data.status === 'cancelled') {
        setStatus('failed');
        setError('Payment was not completed');
      }
    }
  }, [verifyPaymentQuery.data]);

  const openCheckout = async (url: string) => {
    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
        setStatus('verifying');
      } else {
        const result = await WebBrowser.openBrowserAsync(url);
        console.log('[Arifpay] Browser result:', result);
        setStatus('verifying');
      }
    } catch (err) {
      console.error('[Arifpay] Browser open error:', err);
      Alert.alert('Error', 'Failed to open payment page');
    }
  };

  const handleStartPayment = () => {
    setStatus('creating');
    setError('');
    createCheckoutMutation.mutate({
      tier: tier as 'silver' | 'gold' | 'vip',
      successUrl: 'myapp://payment-success',
      cancelUrl: 'myapp://payment-cancelled',
    });
  };

  const handleVerifyManually = () => {
    if (sessionId) {
      setStatus('verifying');
    } else {
      Alert.alert('Error', 'No payment session found');
    }
  };

  const handleBackToPremium = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/premium' as any);
    }
  };

  const renderStatusContent = () => {
    switch (status) {
      case 'idle':
        return (
          <View style={styles.statusContainer}>
            <CreditCard size={80} color={Colors.primary} />
            <Text style={styles.statusTitle}>Pay with Arifpay</Text>
            <Text style={styles.statusText}>
              Secure payment gateway powered by Arifpay.{'\n'}
              You&apos;ll be redirected to complete your payment.
            </Text>
            <GradientButton
              title={`Pay for ${tier?.toUpperCase()} Plan`}
              onPress={handleStartPayment}
              style={styles.actionButton}
              testID="start-payment-btn"
            />
          </View>
        );

      case 'creating':
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.statusTitle}>Creating payment session...</Text>
            <Text style={styles.statusText}>Please wait</Text>
          </View>
        );

      case 'pending':
        return (
          <View style={styles.statusContainer}>
            <CreditCard size={80} color={Colors.primary} />
            <Text style={styles.statusTitle}>Complete Payment</Text>
            <Text style={styles.statusText}>
              A payment window has been opened.{'\n'}
              Complete your payment and return here.
            </Text>
            <GradientButton
              title="I&apos;ve Paid - Verify Now"
              onPress={handleVerifyManually}
              style={styles.actionButton}
              testID="verify-payment-btn"
            />
            {checkoutUrl && (
              <TouchableOpacity
                onPress={() => openCheckout(checkoutUrl)}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>Reopen Payment Window</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'verifying':
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.statusTitle}>Verifying payment...</Text>
            <Text style={styles.statusText}>
              Please wait while we confirm your payment
            </Text>
            {verifyPaymentQuery.isError && (
              <Text style={styles.errorText}>
                Verification taking longer than expected
              </Text>
            )}
          </View>
        );

      case 'completed':
        return (
          <View style={styles.statusContainer}>
            <CheckCircle size={80} color={Colors.success} />
            <Text style={styles.statusTitle}>Payment Successful!</Text>
            <Text style={styles.statusText}>
              Your {tier?.toUpperCase()} membership has been activated.
            </Text>
            <GradientButton
              title="Back to Profile"
              onPress={() => router.replace('/(tabs)/profile' as any)}
              style={styles.actionButton}
              testID="back-to-profile-btn"
            />
          </View>
        );

      case 'failed':
        return (
          <View style={styles.statusContainer}>
            <XCircle size={80} color={Colors.error} />
            <Text style={styles.statusTitle}>Payment Failed</Text>
            <Text style={styles.statusText}>{error || 'Something went wrong'}</Text>
            <GradientButton
              title="Try Again"
              onPress={() => setStatus('idle')}
              style={styles.actionButton}
              testID="retry-btn"
            />
            <TouchableOpacity onPress={handleBackToPremium} style={styles.linkButton}>
              <Text style={styles.linkText}>Back to Plans</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBackToPremium}
          style={styles.closeButton}
          testID="close-btn"
        >
          <X size={24} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>{renderStatusContent()}</View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Having issues?{' '}
          <Text
            style={styles.footerLink}
            onPress={() => router.push('/payment-verification' as any)}
          >
            Use Manual Payment
          </Text>
        </Text>
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
  },
  closeButton: {
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statusContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginTop: 16,
  },
  actionButton: {
    width: '100%',
    marginBottom: 12,
  },
  linkButton: {
    paddingVertical: 12,
  },
  linkText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  footerLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
