import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, Platform } from 'react-native';
import Colors from '@/constants/colors';
import { useRouter } from 'expo-router';
import { safeGoBack } from '@/lib/navigation';
import {
  User,
  Shield,
  Bell,
  Crown,
  Globe,
  ChevronRight,
  ArrowLeft,
  Share2,
  LogOut,
  FileText,
  Lock,
  Info,
  Palette,
} from 'lucide-react-native';
import { useI18n } from '@/hooks/i18n-context';
import * as Linking from 'expo-linking';
import { useAuth } from '@/hooks/auth-context';
import { useMembership } from '@/hooks/membership-context';

interface SettingItemProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  testID?: string;
  danger?: boolean;
  badge?: string;
}

function SettingItem({ icon, iconBg, label, subtitle, onPress, testID, danger, badge }: SettingItemProps) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} testID={testID} activeOpacity={0.6}>
      <View style={[styles.itemIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemLabel, danger && styles.itemLabelDanger]}>{label}</Text>
        {subtitle ? <Text style={styles.itemSubtitle}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {!danger && <ChevronRight size={18} color="#D1D5DB" />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { logout, user } = useAuth();
  const { tier } = useMembership();
  const displayName = useMemo(() => user?.name ?? 'You', [user?.name]);
  const avatar = useMemo(() => user?.profile?.photos?.[0] ?? 'https://images.unsplash.com/photo-1544006659-f0b21884ce1d?q=80&w=256&auto=format&fit=crop', [user?.profile?.photos]);
  const tierLabel = useMemo(() => {
    if (tier === 'vip') return 'VIP';
    if (tier === 'gold') return 'Gold';
    return 'Free';
  }, [tier]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.log('[Settings] Logout error (continuing):', e);
    }
    router.replace('/(auth)/login' as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          onPress={() => safeGoBack(router, '/(tabs)/profile')}
          testID="settings-back-btn"
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Settings')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => router.push('/profile-settings' as any)}
          activeOpacity={0.7}
        >
          <Image source={{ uri: avatar }} style={styles.avatar} accessibilityIgnoresInvertColors />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <View style={styles.tierRow}>
              <View style={[styles.tierPill, tier !== 'free' && styles.tierPillActive]}>
                <Crown size={12} color={tier !== 'free' ? '#F59E0B' : Colors.text.light} />
                <Text style={[styles.tierPillText, tier !== 'free' && styles.tierPillTextActive]}>{tierLabel}</Text>
              </View>
            </View>
          </View>
          <ChevronRight size={20} color="#D1D5DB" />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>{t('Account')}</Text>
        <View style={styles.section}>
          <SettingItem
            icon={<User size={18} color="#FF2D55" />}
            iconBg="#FFF1F3"
            label={t('Edit Profile')}
            subtitle={t('Photos, bio, interests')}
            onPress={() => router.push('/profile-settings' as any)}
            testID="settings-edit-profile"
          />
          <View style={styles.divider} />
          <SettingItem
            icon={<User size={18} color="#3B82F6" />}
            iconBg="#EFF6FF"
            label={t('Account Settings')}
            subtitle={t('Email, password, data')}
            onPress={() => router.push('/settings/account' as any)}
            testID="settings-account"
          />
        </View>

        <Text style={styles.sectionLabel}>{t('Privacy & Security')}</Text>
        <View style={styles.section}>
          <SettingItem
            icon={<Shield size={18} color="#8B5CF6" />}
            iconBg="#EDE9FE"
            label={t('Privacy')}
            subtitle={t('Visibility, incognito mode')}
            onPress={() => router.push('/settings/privacy' as any)}
            testID="settings-privacy"
          />
          <View style={styles.divider} />
          <SettingItem
            icon={<Lock size={18} color="#059669" />}
            iconBg="#ECFDF5"
            label={t('Security')}
            subtitle={t('Biometric, 2FA, login alerts')}
            onPress={() => router.push('/settings/security' as any)}
            testID="settings-security"
          />
          <View style={styles.divider} />
          <SettingItem
            icon={<Info size={18} color="#6B7280" />}
            iconBg="#F3F4F6"
            label={t('App Permissions')}
            onPress={() => router.push('/permissions-info' as any)}
            testID="settings-permissions"
          />
        </View>

        <Text style={styles.sectionLabel}>{t('Notifications')}</Text>
        <View style={styles.section}>
          <SettingItem
            icon={<Bell size={18} color="#F59E0B" />}
            iconBg="#FEF3C7"
            label={t('Push Notifications')}
            subtitle={t('Likes, matches, messages')}
            onPress={() => router.push('/settings/notifications' as any)}
            testID="settings-notifications"
          />
        </View>

        <Text style={styles.sectionLabel}>{t('Subscription')}</Text>
        <View style={styles.section}>
          <SettingItem
            icon={<Crown size={18} color="#F59E0B" />}
            iconBg="#FEF3C7"
            label={t('Premium Plans')}
            subtitle={tier === 'free' ? t('Upgrade for more features') : t('Manage your plan')}
            onPress={() => router.push('/premium' as any)}
            testID="settings-upgrade"
            badge={tier === 'free' ? 'NEW' : undefined}
          />
          <View style={styles.divider} />
          <SettingItem
            icon={<Share2 size={18} color="#22C55E" />}
            iconBg="#ECFDF5"
            label={t('Invite & Earn Gold')}
            subtitle={t('Get 30 days Gold free')}
            onPress={() => router.push('/referrals' as any)}
            testID="settings-referrals"
          />
        </View>

        <Text style={styles.sectionLabel}>{t('App')}</Text>
        <View style={styles.section}>
          <SettingItem
            icon={<Globe size={18} color="#3B82F6" />}
            iconBg="#EFF6FF"
            label={t('Language')}
            onPress={() => router.push('/language' as any)}
            testID="settings-language"
          />
          <View style={styles.divider} />
          <SettingItem
            icon={<FileText size={18} color="#6B7280" />}
            iconBg="#F3F4F6"
            label={t('Terms & Conditions')}
            onPress={() => router.push('/terms' as any)}
            testID="settings-terms"
          />
          <View style={styles.divider} />
          <SettingItem
            icon={<FileText size={18} color="#6B7280" />}
            iconBg="#F3F4F6"
            label={t('Privacy Policy')}
            onPress={() => router.push('/privacy-policy' as any)}
            testID="settings-privacy-policy"
          />
        </View>

        <View style={styles.section}>
          <SettingItem
            icon={<LogOut size={18} color="#EF4444" />}
            iconBg="#FEF2F2"
            label={t('Sign Out')}
            onPress={handleLogout}
            testID="settings-logout"
            danger
          />
        </View>

        <Text style={styles.versionText}>Zewijuna v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FA',
  },
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    marginRight: 14,
    backgroundColor: '#E5E7EB',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  tierRow: {
    flexDirection: 'row',
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tierPillActive: {
    backgroundColor: '#FEF3C7',
  },
  tierPillText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text.light,
  },
  tierPillTextActive: {
    color: '#B45309',
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
  section: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  itemLabelDanger: {
    color: '#EF4444',
  },
  itemSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 68,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.text.light,
    marginTop: 8,
    marginBottom: 16,
  },
});
