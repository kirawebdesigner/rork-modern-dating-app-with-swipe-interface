import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { safeGoBack } from '@/lib/navigation';
import Colors from '@/constants/colors';
import { ArrowLeft, Shield, Eye, EyeOff, AlertCircle, Fingerprint } from 'lucide-react-native';
import { useI18n } from '@/hooks/i18n-context';
import GradientButton from '@/components/GradientButton';
import { useAuth } from '@/hooks/auth-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_KEY = 'biometric_enabled';
const LOGIN_ALERTS_KEY = 'login_alerts_enabled';
const TWO_FACTOR_KEY = 'two_factor_enabled';

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(false);
  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<string>('Biometric');
  const [loginAlerts, setLoginAlerts] = useState<boolean>(true);
  const [showSensitiveData, setShowSensitiveData] = useState<boolean>(false);

  const phoneNumber = '';
  const maskedPhone = phoneNumber.length > 4
    ? phoneNumber.slice(0, -4).replace(/\d/g, '*') + phoneNumber.slice(-4)
    : '****';

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [bioEnabled, alertsEnabled, tfaEnabled] = await Promise.all([
          AsyncStorage.getItem(BIOMETRIC_KEY),
          AsyncStorage.getItem(LOGIN_ALERTS_KEY),
          AsyncStorage.getItem(TWO_FACTOR_KEY),
        ]);
        if (bioEnabled !== null) setBiometricEnabled(bioEnabled === 'true');
        if (alertsEnabled !== null) setLoginAlerts(alertsEnabled === 'true');
        if (tfaEnabled !== null) setTwoFactorEnabled(tfaEnabled === 'true');
      } catch (e) {
        console.log('[Security] load settings error', e);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const checkBiometric = async () => {
      if (Platform.OS === 'web') {
        setBiometricAvailable(false);
        return;
      }
      try {
        const LocalAuth = await import('expo-local-authentication');
        const compatible = await LocalAuth.hasHardwareAsync();
        const enrolled = await LocalAuth.isEnrolledAsync();
        setBiometricAvailable(compatible && enrolled);

        if (compatible) {
          const types = await LocalAuth.supportedAuthenticationTypesAsync();
          const AuthenticationType = LocalAuth.AuthenticationType;
          if (types.includes(AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('Face ID');
          } else if (types.includes(AuthenticationType.FINGERPRINT)) {
            setBiometricType('Fingerprint');
          } else if (types.includes(AuthenticationType.IRIS)) {
            setBiometricType('Iris');
          }
        }
        console.log('[Security] Biometric available:', compatible && enrolled, 'type:', biometricType);
      } catch (e) {
        console.log('[Security] biometric check error', e);
        setBiometricAvailable(false);
      }
    };
    checkBiometric();
  }, []);

  const handleBiometricToggle = useCallback(async (value: boolean) => {
    if (value && Platform.OS !== 'web') {
      try {
        const LocalAuth = await import('expo-local-authentication');
        const result = await LocalAuth.authenticateAsync({
          promptMessage: t('Verify your identity to enable biometric login'),
          cancelLabel: t('Cancel'),
          fallbackLabel: t('Use passcode'),
          disableDeviceFallback: false,
        });

        if (result.success) {
          setBiometricEnabled(true);
          await AsyncStorage.setItem(BIOMETRIC_KEY, 'true');
          console.log('[Security] Biometric enabled successfully');
        } else {
          console.log('[Security] Biometric auth cancelled or failed');
        }
      } catch (e) {
        console.log('[Security] biometric toggle error', e);
        Alert.alert(t('Error'), t('Could not enable biometric authentication'));
      }
    } else {
      setBiometricEnabled(false);
      await AsyncStorage.setItem(BIOMETRIC_KEY, 'false');
      console.log('[Security] Biometric disabled');
    }
  }, [t]);

  const handleSave = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(BIOMETRIC_KEY, String(biometricEnabled)),
        AsyncStorage.setItem(LOGIN_ALERTS_KEY, String(loginAlerts)),
        AsyncStorage.setItem(TWO_FACTOR_KEY, String(twoFactorEnabled)),
      ]);
      Alert.alert(t('Success'), t('Security settings updated successfully'));
    } catch (e) {
      console.log('[Security] save error', e);
      Alert.alert(t('Error'), t('Could not save settings'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerWrap}>
        <View style={styles.headerBg} />
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => safeGoBack(router, '/settings')}
            style={styles.backBtn}
            accessibilityLabel={t('Back')}
            testID="security-back"
          >
            <ArrowLeft size={20} color={Colors.text.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('Security')}</Text>
          <View style={{ width: 28 }} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Shield size={32} color={Colors.primary} />
          <Text style={styles.infoTitle}>{t('Keep Your Account Safe')}</Text>
          <Text style={styles.infoText}>
            {t('Enable additional security features to protect your account from unauthorized access')}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('Account Information')}</Text>
          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('Phone Number')}</Text>
              <View style={styles.infoValueRow}>
                <Text style={styles.infoValue}>
                  {showSensitiveData ? phoneNumber : maskedPhone}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowSensitiveData(!showSensitiveData)}
                  style={styles.eyeButton}
                >
                  {showSensitiveData ? (
                    <EyeOff size={18} color={Colors.text.secondary} />
                  ) : (
                    <Eye size={18} color={Colors.text.secondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('Account Created')}</Text>
              <Text style={styles.infoValue}>
                {new Date().toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('Authentication')}</Text>
          <View style={styles.cardBody}>
            <Row
              label={t('Two-Factor Authentication')}
              description={t('Add an extra layer of security with SMS verification')}
              value={twoFactorEnabled}
              onValueChange={(v) => setTwoFactorEnabled(v)}
              testID="2fa-switch"
            />
            <View style={[styles.row, styles.biometricRow]}>
              <View style={styles.biometricLeft}>
                <View style={styles.biometricIconWrap}>
                  <Fingerprint size={22} color={biometricAvailable ? Colors.primary : Colors.text.light} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>{biometricType} {t('Login')}</Text>
                  <Text style={styles.rowDescription}>
                    {biometricAvailable
                      ? t('Use biometric authentication to unlock the app')
                      : Platform.OS === 'web'
                        ? t('Biometric auth is not available on web')
                        : t('No biometric hardware detected on this device')}
                  </Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={!biometricAvailable}
                testID="biometric-switch"
              />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('Activity Monitoring')}</Text>
          <View style={styles.cardBody}>
            <Row
              label={t('Login Alerts')}
              description={t('Get notified when someone logs into your account')}
              value={loginAlerts}
              onValueChange={(v) => setLoginAlerts(v)}
              testID="login-alerts-switch"
              last
            />
          </View>
        </View>

        <View style={styles.warningCard}>
          <AlertCircle size={24} color="#EF4444" />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>{t('Account Security Tips')}</Text>
            <Text style={styles.warningText}>
              • {t('Never share your phone verification codes')}{'\n'}
              • {t('Use a unique phone number for your account')}{'\n'}
              • {t('Enable two-factor authentication for extra security')}{'\n'}
              • {t('Log out from devices you don\'t recognize')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.dangerButton}
          onPress={() => {
            Alert.alert(
              t('Delete Account'),
              t('Are you sure you want to permanently delete your account? This action cannot be undone.'),
              [
                { text: t('Cancel'), style: 'cancel' },
                {
                  text: t('Delete'),
                  style: 'destructive',
                  onPress: () => {
                    Alert.alert(t('Coming Soon'), t('Account deletion feature will be available soon'));
                  },
                },
              ]
            );
          }}
        >
          <Text style={styles.dangerButtonText}>{t('Delete Account')}</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <View style={styles.footer} testID="save-bar-security">
        <GradientButton
          title={t('Save Changes')}
          onPress={handleSave}
          style={styles.saveButton}
        />
      </View>
    </SafeAreaView>
  );
}

function Row({
  label,
  description,
  value,
  onValueChange,
  testID,
  last,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  testID?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description && <Text style={styles.rowDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundSecondary },
  headerWrap: { backgroundColor: 'transparent' },
  headerBg: { height: 140, backgroundColor: Colors.primary },
  headerRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: Colors.text.white, fontSize: 18, fontWeight: '700' as const },
  backBtn: { padding: 6 },
  content: { paddingTop: 56, paddingHorizontal: 16 },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 8,
    fontWeight: '600' as const,
  },
  card: { marginBottom: 16 },
  cardBody: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    shadowColor: Colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  row: {
    paddingVertical: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  rowDescription: {
    color: Colors.text.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  biometricRow: {
    borderBottomWidth: 0,
  },
  biometricLeft: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  biometricIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF1F3',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  infoRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  infoValueRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500' as const,
  },
  eyeButton: {
    padding: 4,
  },
  warningCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 20,
    marginVertical: 24,
    flexDirection: 'row' as const,
    gap: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#DC2626',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
  },
  dangerButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 24,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#DC2626',
  },
  bottomSpacing: {
    height: 100,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 34,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 6,
  },
  saveButton: {
    marginTop: 8,
  },
});
