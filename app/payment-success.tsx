import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle, AlertCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GradientButton from '@/components/GradientButton';
import { useAuth } from '@/hooks/auth-context';
import { trpc } from '@/lib/trpc';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { reloadProfile } = useAuth();
  const params = useLocalSearchParams();
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : undefined;
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

  const verifyQuery = trpc.payment.verify.useQuery(
    { sessionId: sessionId! }, 
    { 
      enabled: !!sessionId,
      retry: 2,
    }
  );

  useEffect(() => {
    if (sessionId) {
      if (verifyQuery.data?.success) {
        setVerified(true);
        setIsVerifying(false);
        reloadProfile().catch(console.error);
      } else if (verifyQuery.error) {
        setIsVerifying(false);
      }
    } else {
      // If no session ID, assume manual navigation or testing
      setIsVerifying(false);
      setVerified(true);
      reloadProfile().catch(console.error);
    }
  }, [sessionId, verifyQuery.data, verifyQuery.error, reloadProfile]);

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
            <View style={styles.iconContainer}>
              <CheckCircle size={80} color={Colors.success} />
            </View>
            <Text style={styles.title}>Payment Successful!</Text>
            <Text style={styles.subtitle}>
              Your membership has been upgraded. You can now enjoy all the premium features.
            </Text>
            <GradientButton
              title="Continue"
              onPress={() => router.replace('/(tabs)/profile' as any)}
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
});
