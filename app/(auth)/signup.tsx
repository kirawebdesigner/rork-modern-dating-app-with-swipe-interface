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
import { ArrowLeft, CheckSquare, Square, Mail, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GradientButton from '@/components/GradientButton';
import { useAuth } from '@/hooks/auth-context';
import { useI18n } from '@/hooks/i18n-context';

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const { t } = useI18n();
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);
  const [confirmedAge, setConfirmedAge] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);

  const handleSignup = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      alert(t('Error') + ': ' + t('Please fill in all fields'));
      return;
    }

    if (password.length < 8) {
      alert(t('Error') + ': ' + t('Password must be at least 8 characters long'));
      return;
    }

    if (password !== confirmPassword) {
      alert(t('Error') + ': ' + t('Passwords do not match'));
      return;
    }

    if (!confirmedAge) {
      alert(t('Error') + ': ' + t('Please confirm you are 18 or older'));
      return;
    }

    if (!agreedToTerms) {
      alert(t('Error') + ': ' + t('Please agree to the Terms & Conditions and Privacy Policy'));
      return;
    }

    setLoading(true);
    try {
      await signup(trimmedEmail, password, trimmedName);
      router.push('/profile-setup');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('Signup failed. Please try again.');
      alert(t('Error') + ': ' + message);
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
              <View style={styles.inputWrapper}>
                <UserIcon size={18} color={Colors.text.secondary} />
                <TextInput
                  style={styles.input}
                  placeholder={t('Your name')}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  testID="signup-name"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('Email')}</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color={Colors.text.secondary} />
                <TextInput
                  style={styles.input}
                  placeholder={t('you@example.com')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  testID="signup-email"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('Password')}</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={Colors.text.secondary} />
                <TextInput
                  style={styles.input}
                  placeholder={t('Create a password')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="newPassword"
                  testID="signup-password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  testID="signup-toggle-password"
                >
                  {showPassword ? <EyeOff size={18} color={Colors.text.secondary} /> : <Eye size={18} color={Colors.text.secondary} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('Confirm Password')}</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={Colors.text.secondary} />
                <TextInput
                  style={styles.input}
                  placeholder={t('Confirm your password')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="newPassword"
                  testID="signup-confirm-password"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm((prev) => !prev)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  testID="signup-toggle-confirm"
                >
                  {showConfirm ? <EyeOff size={18} color={Colors.text.secondary} /> : <Eye size={18} color={Colors.text.secondary} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setConfirmedAge((prev) => !prev)}
                testID="age-checkbox"
              >
                {confirmedAge ? (
                  <CheckSquare size={24} color={Colors.primary} />
                ) : (
                  <Square size={24} color={Colors.text.secondary} />
                )}
                <Text style={styles.checkboxText}>
                  {t('I confirm that I am 18 years or older')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAgreedToTerms((prev) => !prev)}
                testID="terms-checkbox"
              >
                {agreedToTerms ? (
                  <CheckSquare size={24} color={Colors.primary} />
                ) : (
                  <Square size={24} color={Colors.text.secondary} />
                )}
                <Text style={styles.checkboxText}>
                  {t('I agree to the')}{' '}
                  <Text
                    style={styles.linkText}
                    onPress={(event) => {
                      event.stopPropagation();
                      router.push('/terms' as any);
                    }}
                  >
                    {t('Terms & Conditions')}
                  </Text>
                  {' '}{t('and')}{' '}
                  <Text
                    style={styles.linkText}
                    onPress={(event) => {
                      event.stopPropagation();
                      router.push('/privacy-policy' as any);
                    }}
                  >
                    {t('Privacy Policy')}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>

            <GradientButton
              title={loading ? t('Signing Up...') : t('Sign Up')}
              onPress={handleSignup}
              loading={loading}
              style={styles.button}
              testID="signup-submit"
            />
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
    paddingBottom: 40,
  },
  backButton: {
    marginTop: 20,
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
    paddingHorizontal: 20,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  form: {
    flex: 1,
    gap: 18,
  },
  inputContainer: {
    gap: 10,
  },
  label: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  checkboxContainer: {
    gap: 16,
    marginTop: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  linkText: {
    color: Colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  button: {
    marginTop: 12,
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
