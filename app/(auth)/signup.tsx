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
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GradientButton from '@/components/GradientButton';
import { useAuth } from '@/hooks/auth-context';
import { useI18n } from '@/hooks/i18n-context';

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    const nameTrim = name.trim();
    const emailTrim = email.trim();
    if (!nameTrim || !emailTrim || !password) {
      alert(t('Error') + ': ' + t('Please fill in all fields'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      alert(t('Error') + ': ' + t('Please enter a valid email'));
      return;
    }
    if (password.length < 6) {
      alert(t('Error') + ': ' + t('Password must be at least 6 characters'));
      return;
    }

    setLoading(true);
    try {
      await signup(emailTrim, password, nameTrim);
      router.replace('/profile-setup' as any);
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? '';
      if (msg === 'EMAIL_CONFIRMATION_REQUIRED') {
        alert(t('Check your email to confirm your account. Then open the app again.'));
      } else {
        alert(t('Error') + ': ' + (msg || t('Signup failed. Please try again.')));
      }
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/onboarding' as any);
              }
            }}
          >
            <ArrowLeft size={24} color={Colors.text.primary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Image
              source={{ uri: 'https://r2-pub.rork.com/attachments/7ad429rooy5pod22dq187' }}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Brand logo"
              testID="signup-logo"
            />
            <Text style={styles.title}>{t('Create Account')}</Text>
            <Text style={styles.subtitle}>
              {t('Sign up to start finding your perfect match')}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('Name')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('Your name')}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                testID="signup-name"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('Email')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('Email')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                testID="signup-email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('Password')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('Password')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                testID="signup-password"
              />
            </View>

            <GradientButton
              title={t('Sign Up')}
              onPress={handleSignup}
              loading={loading}
              style={styles.button}
              testID="signup-submit"
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialButtonText}>Continue with Facebook</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('Already have an account?')} </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)}>
              <Text style={styles.footerLink}>{t('Sign In')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  backButton: {
    marginTop: 20,
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 12,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text.primary,
  },
  button: {
    marginTop: 20,
    marginBottom: 30,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: Colors.text.secondary,
    fontSize: 14,
  },
  socialButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  socialButtonText: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
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