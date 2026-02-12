import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { safeGoBack } from '@/lib/navigation';
import Colors from '@/constants/colors';
import { ArrowLeft, Eye, EyeOff, UserX, Crown } from 'lucide-react-native';
import { useI18n } from '@/hooks/i18n-context';
import { useMembership } from '@/hooks/membership-context';
import { useApp } from '@/hooks/app-context';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { tier } = useMembership();
  const { updateProfile } = useApp();
  const [hideDistance, setHideDistance] = useState<boolean>(false);
  const [incognito, setIncognito] = useState<boolean>(false);
  const [privateAccount, setPrivateAccount] = useState<boolean>(false);
  const isPremium = tier === 'gold' || tier === 'vip';

  const handleSave = async () => {
    await updateProfile({ privacy: { visibility: privateAccount ? 'matches' : 'everyone', hideOnlineStatus: false, incognito } as any });
    Alert.alert(t('Saved'), t('Privacy settings updated'));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack(router, '/settings')} style={styles.backBtn} accessibilityLabel={t('Back')} testID="privacy-back">
          <ArrowLeft size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Privacy')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>{t('Visibility')}</Text>
        <View style={styles.card}>
          <PrivacyRow
            icon={<Eye size={18} color="#3B82F6" />}
            iconBg="#EFF6FF"
            label={t('Private Account')}
            subtitle={t('Only matches can see your profile')}
            value={privateAccount}
            onValueChange={setPrivateAccount}
          />
          <View style={styles.divider} />
          <PrivacyRow
            icon={<EyeOff size={18} color={isPremium ? '#8B5CF6' : '#9CA3AF'} />}
            iconBg={isPremium ? '#EDE9FE' : '#F3F4F6'}
            label={t('Hide Location')}
            subtitle={isPremium ? t('Your distance is hidden') : t('Requires Gold or VIP')}
            value={hideDistance}
            onValueChange={setHideDistance}
            disabled={!isPremium}
            premiumLocked={!isPremium}
          />
          <View style={styles.divider} />
          <PrivacyRow
            icon={<UserX size={18} color={isPremium ? '#059669' : '#9CA3AF'} />}
            iconBg={isPremium ? '#ECFDF5' : '#F3F4F6'}
            label={t('Incognito Mode')}
            subtitle={isPremium ? t('Browse without being seen') : t('Requires Gold or VIP')}
            value={incognito}
            onValueChange={(v) => { if (isPremium) setIncognito(v); }}
            disabled={!isPremium}
            premiumLocked={!isPremium}
          />
        </View>

        {!isPremium && (
          <TouchableOpacity
            style={styles.upgradeHint}
            onPress={() => router.push('/premium' as any)}
            activeOpacity={0.8}
          >
            <Crown size={18} color="#F59E0B" />
            <Text style={styles.upgradeHintText}>{t('Upgrade to Gold+ for advanced privacy')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>{t('Save Changes')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PrivacyRow({ icon, iconBg, label, subtitle, value, onValueChange, disabled, premiumLocked }: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  premiumLocked?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.rowContent}>
        <View style={styles.rowLabelRow}>
          <Text style={styles.rowLabel}>{label}</Text>
          {premiumLocked && (
            <View style={styles.lockBadge}>
              <Crown size={10} color="#F59E0B" />
            </View>
          )}
        </View>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled ?? false}
        testID={`switch-${label}`}
      />
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
  content: { paddingHorizontal: 20, paddingTop: 8 },
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
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDisabled: {
    opacity: 0.6,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowContent: { flex: 1 },
  rowLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowLabel: { fontSize: 15, fontWeight: '600' as const, color: Colors.text.primary },
  rowSubtitle: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  lockBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 68 },
  upgradeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 24,
  },
  upgradeHintText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#B45309',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#FFF', fontWeight: '700' as const, fontSize: 16 },
});
