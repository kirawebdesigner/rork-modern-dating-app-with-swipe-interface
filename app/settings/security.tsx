import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { ArrowLeft, Shield, Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import { useI18n } from '@/hooks/i18n-context';
import GradientButton from '@/components/GradientButton';
import { useAuth } from '@/hooks/auth-context';

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(false);
  const [loginAlerts, setLoginAlerts] = useState<boolean>(true);
  const [showSensitiveData, setShowSensitiveData] = useState<boolean>(false);

  const phoneNumber = '';
  const maskedPhone = phoneNumber.length > 4
    ? phoneNumber.slice(0, -4).replace(/\d/g, '*') + phoneNumber.slice(-4)
    : '****';

  const handleSave = async () => {
    Alert.alert(t('Success'), t('Security settings updated successfully'));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerWrap}>
        <View style={styles.headerBg} />
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/settings' as any);
              }
            }}
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
            <Row
              label={t('Biometric Login')}
              description={t('Use fingerprint or face ID to login quickly')}
              value={biometricEnabled}
              onValueChange={(v) => setBiometricEnabled(v)}
              testID="biometric-switch"
              last
            />
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
  headerTitle: { color: Colors.text.white, fontSize: 18, fontWeight: '700' },
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
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 8,
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontWeight: '500',
    marginBottom: 4,
  },
  rowDescription: {
    color: Colors.text.secondary,
    fontSize: 13,
    lineHeight: 18,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  eyeButton: {
    padding: 4,
  },
  warningCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 20,
    marginVertical: 24,
    flexDirection: 'row',
    gap: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
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
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 24,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '700',
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
