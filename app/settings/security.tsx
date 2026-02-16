import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert, Platform, TextInput, Modal, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { safeGoBack } from '@/lib/navigation';
import Colors from '@/constants/colors';
import { ArrowLeft, Shield, Eye, EyeOff, AlertCircle, Fingerprint, Smartphone, Bell, Lock, X } from 'lucide-react-native';
import { useI18n } from '@/hooks/i18n-context';
import { useAuth } from '@/hooks/auth-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_KEY = 'biometric_enabled';
const LOGIN_ALERTS_KEY = 'login_alerts_enabled';
const TWO_FACTOR_KEY = 'two_factor_enabled';
const PIN_CODE_KEY = 'pin_code';

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
  const [showPinSetup, setShowPinSetup] = useState<boolean>(false);
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter');
  const [pinInput, setPinInput] = useState<string>('');
  const [pinConfirm, setPinConfirm] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [hasExistingPin, setHasExistingPin] = useState<boolean>(false);

  const userEmail = user?.email ?? '';
  const maskedEmail = userEmail.length > 4
    ? userEmail.slice(0, 3) + '***' + userEmail.slice(userEmail.indexOf('@'))
    : '****';

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [bioEnabled, alertsEnabled, tfaEnabled, savedPin] = await Promise.all([
          AsyncStorage.getItem(BIOMETRIC_KEY),
          AsyncStorage.getItem(LOGIN_ALERTS_KEY),
          AsyncStorage.getItem(TWO_FACTOR_KEY),
          AsyncStorage.getItem(PIN_CODE_KEY),
        ]);
        if (bioEnabled !== null) setBiometricEnabled(bioEnabled === 'true');
        if (alertsEnabled !== null) setLoginAlerts(alertsEnabled === 'true');
        if (tfaEnabled !== null) setTwoFactorEnabled(tfaEnabled === 'true');
        setHasExistingPin(!!savedPin);
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
      } catch (e) {
        console.log('[Security] biometric check error', e);
        setBiometricAvailable(false);
      }
    };
    checkBiometric();
  }, []);

  const handleTwoFactorToggle = useCallback(async (value: boolean) => {
    if (value) {
      setShowPinSetup(true);
      setPinStep('enter');
      setPinInput('');
      setPinConfirm('');
      setPinError('');
    } else {
      Alert.alert(
        t('Disable 2FA'),
        t('Are you sure you want to disable two-factor authentication?'),
        [
          { text: t('Cancel'), style: 'cancel' },
          {
            text: t('Disable'),
            style: 'destructive',
            onPress: async () => {
              setTwoFactorEnabled(false);
              await AsyncStorage.setItem(TWO_FACTOR_KEY, 'false');
              await AsyncStorage.removeItem(PIN_CODE_KEY);
              setHasExistingPin(false);
              console.log('[Security] 2FA disabled and PIN removed');
            },
          },
        ]
      );
    }
  }, [t]);

  const handlePinSubmit = useCallback(async () => {
    if (pinStep === 'enter') {
      if (pinInput.length !== 4) {
        setPinError(t('PIN must be 4 digits'));
        return;
      }
      if (!/^\d{4}$/.test(pinInput)) {
        setPinError(t('PIN must contain only numbers'));
        return;
      }
      setPinError('');
      setPinConfirm('');
      setPinStep('confirm');
    } else {
      if (pinConfirm !== pinInput) {
        setPinError(t('PINs do not match'));
        setPinConfirm('');
        return;
      }
      try {
        await AsyncStorage.setItem(PIN_CODE_KEY, pinInput);
        await AsyncStorage.setItem(TWO_FACTOR_KEY, 'true');
        setTwoFactorEnabled(true);
        setHasExistingPin(true);
        setShowPinSetup(false);
        setPinInput('');
        setPinConfirm('');
        Alert.alert(t('Success'), t('Two-factor authentication has been enabled with your PIN'));
        console.log('[Security] 2FA enabled with PIN');
      } catch (e) {
        setPinError(t('Failed to save PIN'));
        console.log('[Security] PIN save error', e);
      }
    }
  }, [pinStep, pinInput, pinConfirm, t]);

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
          Alert.alert(t('Success'), t('Biometric login enabled'));
          console.log('[Security] Biometric enabled');
        }
      } catch (e) {
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
      Alert.alert(t('Error'), t('Could not save settings'));
    }
  };

  const renderPinSetupModal = () => (
    <Modal
      visible={showPinSetup}
      animationType="slide"
      transparent
      onRequestClose={() => setShowPinSetup(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {pinStep === 'enter' ? t('Set Your PIN') : t('Confirm Your PIN')}
            </Text>
            <TouchableOpacity
              onPress={() => setShowPinSetup(false)}
              style={styles.modalCloseBtn}
            >
              <X size={20} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.pinIconWrap}>
            <Lock size={28} color={Colors.primary} />
          </View>

          <Text style={styles.modalSubtitle}>
            {pinStep === 'enter'
              ? t('Choose a 4-digit PIN to secure your account')
              : t('Re-enter your PIN to confirm')}
          </Text>

          <View style={styles.pinInputWrap}>
            <TextInput
              style={styles.pinTextInput}
              value={pinStep === 'enter' ? pinInput : pinConfirm}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
                if (pinStep === 'enter') {
                  setPinInput(cleaned);
                } else {
                  setPinConfirm(cleaned);
                }
                setPinError('');
              }}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholder="• • • •"
              placeholderTextColor={Colors.text.light}
              autoFocus
              testID="pin-input"
            />
          </View>

          <View style={styles.pinDotsRow}>
            {Array.from({ length: 4 }).map((_, i) => {
              const val = pinStep === 'enter' ? pinInput : pinConfirm;
              return (
                <View
                  key={i}
                  style={[
                    styles.pinDot,
                    i < val.length && styles.pinDotFilled,
                    pinError ? styles.pinDotError : null,
                  ]}
                />
              );
            })}
          </View>

          {pinError ? (
            <Text style={styles.pinErrorText}>{pinError}</Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.pinSubmitBtn,
              (pinStep === 'enter' ? pinInput.length : pinConfirm.length) < 4 && styles.pinSubmitBtnDisabled,
            ]}
            onPress={handlePinSubmit}
            disabled={(pinStep === 'enter' ? pinInput.length : pinConfirm.length) < 4}
            activeOpacity={0.8}
          >
            <Text style={styles.pinSubmitText}>
              {pinStep === 'enter' ? t('Next') : t('Enable 2FA')}
            </Text>
          </TouchableOpacity>

          {pinStep === 'confirm' && (
            <TouchableOpacity
              style={styles.pinBackBtn}
              onPress={() => {
                setPinStep('enter');
                setPinConfirm('');
                setPinError('');
              }}
            >
              <Text style={styles.pinBackText}>{t('Go Back')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeGoBack(router, '/settings')}
          style={styles.backBtn}
          accessibilityLabel={t('Back')}
          testID="security-back"
        >
          <ArrowLeft size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Security')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Shield size={28} color={Colors.primary} />
          </View>
          <Text style={styles.heroTitle}>{t('Account Protection')}</Text>
          <Text style={styles.heroSubtitle}>{t('Enable security features to keep your account safe')}</Text>
        </View>

        <Text style={styles.sectionLabel}>{t('Account Info')}</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('Email')}</Text>
            <View style={styles.infoValueRow}>
              <Text style={styles.infoValue}>{showSensitiveData ? userEmail : maskedEmail}</Text>
              <TouchableOpacity onPress={() => setShowSensitiveData(!showSensitiveData)} style={styles.eyeBtn}>
                {showSensitiveData ? <EyeOff size={16} color={Colors.text.secondary} /> : <Eye size={16} color={Colors.text.secondary} />}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t('Authentication')}</Text>
        <View style={styles.card}>
          <SecurityRow
            icon={<Smartphone size={18} color="#3B82F6" />}
            iconBg="#EFF6FF"
            label={t('Two-Factor Authentication')}
            subtitle={
              twoFactorEnabled && hasExistingPin
                ? t('Protected with 4-digit PIN')
                : t('Set up a PIN for extra security')
            }
            value={twoFactorEnabled}
            onValueChange={handleTwoFactorToggle}
            testID="2fa-switch"
          />
          {twoFactorEnabled && hasExistingPin && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.changePinRow}
                onPress={() => {
                  setShowPinSetup(true);
                  setPinStep('enter');
                  setPinInput('');
                  setPinConfirm('');
                  setPinError('');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.rowIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Lock size={18} color="#3B82F6" />
                </View>
                <Text style={styles.changePinText}>{t('Change PIN')}</Text>
              </TouchableOpacity>
            </>
          )}
          <View style={styles.divider} />
          <SecurityRow
            icon={<Fingerprint size={18} color={biometricAvailable ? '#8B5CF6' : '#9CA3AF'} />}
            iconBg={biometricAvailable ? '#EDE9FE' : '#F3F4F6'}
            label={`${biometricType} ${t('Login')}`}
            subtitle={
              biometricAvailable
                ? biometricEnabled
                  ? t('Enabled - unlock app with biometrics')
                  : t('Unlock app with biometrics')
                : Platform.OS === 'web'
                  ? t('Not available on web')
                  : t('No biometric hardware detected')
            }
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            disabled={!biometricAvailable}
            testID="biometric-switch"
          />
        </View>

        <Text style={styles.sectionLabel}>{t('Monitoring')}</Text>
        <View style={styles.card}>
          <SecurityRow
            icon={<Bell size={18} color="#F59E0B" />}
            iconBg="#FEF3C7"
            label={t('Login Alerts')}
            subtitle={t('Get notified on new logins')}
            value={loginAlerts}
            onValueChange={setLoginAlerts}
            testID="login-alerts-switch"
          />
        </View>

        <View style={styles.tipsCard}>
          <AlertCircle size={20} color="#EF4444" />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>{t('Security Tips')}</Text>
            <Text style={styles.tipsText}>
              {`\u2022 ${t('Never share verification codes')}\n\u2022 ${t('Enable two-factor authentication')}\n\u2022 ${t('Log out from unknown devices')}`}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>{t('Save Changes')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => {
            Alert.alert(
              t('Delete Account'),
              t('This action cannot be undone. Are you sure?'),
              [
                { text: t('Cancel'), style: 'cancel' },
                { text: t('Delete'), style: 'destructive', onPress: () => Alert.alert(t('Coming Soon'), t('Account deletion will be available soon')) },
              ]
            );
          }}
        >
          <Text style={styles.deleteBtnText}>{t('Delete Account')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {renderPinSetupModal()}
    </View>
  );
}

function SecurityRow({ icon, iconBg, label, subtitle, value, onValueChange, disabled, testID }: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} testID={testID} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 12,
    backgroundColor: '#F8F8FA',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text.primary },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  heroCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFF1F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text.secondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDisabled: { opacity: 0.5 },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600' as const, color: Colors.text.primary },
  rowSubtitle: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 68 },
  changePinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  changePinText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#3B82F6',
  },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  infoLabel: { fontSize: 12, color: Colors.text.secondary, marginBottom: 6 },
  infoValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoValue: { fontSize: 16, color: Colors.text.primary, fontWeight: '500' as const },
  eyeBtn: { padding: 4 },
  tipsCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  tipsContent: { flex: 1 },
  tipsTitle: { fontSize: 14, fontWeight: '700' as const, color: '#DC2626', marginBottom: 6 },
  tipsText: { fontSize: 13, color: '#991B1B', lineHeight: 20 },
  saveBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  saveBtnText: { color: '#FFF', fontWeight: '700' as const, fontSize: 16 },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  deleteBtnText: { color: '#DC2626', fontWeight: '700' as const, fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFF1F3',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  pinInputWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pinTextInput: {
    width: 200,
    height: 56,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    letterSpacing: 16,
    backgroundColor: '#FAFAFA',
  },
  pinDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pinDotError: {
    borderColor: Colors.error,
  },
  pinErrorText: {
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  pinSubmitBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  pinSubmitBtnDisabled: {
    opacity: 0.5,
  },
  pinSubmitText: {
    color: '#FFF',
    fontWeight: '700' as const,
    fontSize: 16,
  },
  pinBackBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  pinBackText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '600' as const,
  },
});
