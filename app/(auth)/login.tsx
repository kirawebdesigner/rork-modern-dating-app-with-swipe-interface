import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GradientButton from '@/components/GradientButton';
import { useAuth } from '@/hooks/auth-context';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogin = async () => {
    console.log('[Login] handleLogin called', { phone });
    const cleanPhone = phone.trim();
    
    if (!cleanPhone) {
      console.log('[Login] Validation failed: empty phone');
      alert('Please enter your phone number');
      return;
    }

    console.log('[Login] Starting login process');
    setLoading(true);
    try {
      await login(cleanPhone);
      console.log('[Login] Login successful, navigating to tabs');
      router.push('/(tabs)');
    } catch (e: any) {
      const msg = (e?.message as string | undefined) ?? 'Login failed. Please try again.';
      console.log('[Login] Login failed:', msg, e);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/onboarding' as any);
            }
          }}
          accessibilityRole="button"
          testID="login-back"
        >
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Image
            source={{ uri: 'https://r2-pub.rork.com/attachments/7ad429rooy5pod22dq187' }}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Brand logo"
            testID="login-logo"
          />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number (e.g., 0944120739)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
              testID="login-phone"
            />
          </View>

          <GradientButton
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={styles.button}
            testID="login-submit"
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup' as any)} testID="login-signup-link">
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  backButton: {
    marginTop: 20,
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text.primary,
    backgroundColor: Colors.background,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    marginTop: 24,
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  footerLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
});