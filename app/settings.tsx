import React, { useMemo } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import Colors from '@/constants/colors';
import { useRouter } from 'expo-router';
import { User, Shield, Bell, Crown, Globe, ChevronRight, ArrowLeft, Share2, Mail, LogOut, FileText, Lock, Info } from 'lucide-react-native';
import { useI18n } from '@/hooks/i18n-context';
import * as Linking from 'expo-linking';
import { useAuth } from '@/hooks/auth-context';

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { logout, user } = useAuth();
  const displayName = useMemo(() => user?.name ?? 'You', [user?.name]);
  const avatar = useMemo(() => user?.profile?.photos?.[0] ?? 'https://images.unsplash.com/photo-1544006659-f0b21884ce1d?q=80&w=256&auto=format&fit=crop', [user?.profile?.photos]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerWrap}>
        <View style={styles.headerBg} />
        <View style={styles.headerRow}>
          <TouchableOpacity accessibilityLabel="Go back" onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)/profile' as any); } }} testID="settings-back-btn" style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ArrowLeft size={20} color={Colors.text.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('Settings')}</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.profileRow}>
          <Image source={{ uri: avatar }} style={styles.avatar} accessibilityIgnoresInvertColors />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.subtitle}>{t('Manage your account, privacy, and app')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <Card title={t('Account')}>
          <Item icon={<User size={18} color={Colors.primary} />} label={t('Edit profile')} onPress={() => router.push('/profile-settings' as any)} testID="settings-edit-profile" />
          <Item icon={<User size={18} color={Colors.primary} />} label={t('Account settings')} onPress={() => router.push('/settings/account' as any)} testID="settings-account" last />
        </Card>

        <Card title={t('Privacy & Security')}>
          <Item icon={<Shield size={18} color={Colors.primary} />} label={t('Privacy settings')} onPress={() => router.push('/settings/privacy' as any)} testID="settings-privacy" />
          <Item icon={<Lock size={18} color={Colors.primary} />} label={t('Security')} onPress={() => router.push('/settings/security' as any)} testID="settings-security" />
          <Item icon={<Info size={18} color={Colors.primary} />} label={t('App Permissions')} onPress={() => router.push('/permissions-info' as any)} testID="settings-permissions" last />
        </Card>

        <Card title={t('Notifications')}>
          <Item icon={<Bell size={18} color={Colors.primary} />} label={t('Manage notifications')} onPress={() => router.push('/settings/notifications' as any)} testID="settings-notifications" last />
        </Card>

        <Card title={t('Subscription')}>
          <Item icon={<Crown size={18} color={Colors.primary} />} label={t('Upgrade to Premium')} onPress={() => router.push('/premium' as any)} testID="settings-upgrade" last />
        </Card>

        <Card title={t('Growth')}>
          <Item icon={<Share2 size={18} color={Colors.primary} />} label={t('Share & Get Gold')} onPress={() => router.push('/referrals' as any)} testID="settings-referrals" />
          <Item icon={<Mail size={18} color={Colors.primary} />} label={t('Share via Email')} onPress={() => Linking.openURL('mailto:zewijuna1@gmail.com?subject=Feedback&body=Hi,%0D%0A')} testID="settings-share-email" last />
        </Card>

        <Card title={t('App')}>
          <Item icon={<Globe size={18} color={Colors.primary} />} label={t('Language')} onPress={() => router.push('/language' as any)} testID="settings-language" />
          <Item icon={<FileText size={18} color={Colors.primary} />} label={t('Terms & Conditions')} onPress={() => router.push('/terms' as any)} testID="settings-terms" />
          <Item icon={<FileText size={18} color={Colors.primary} />} label={t('Privacy Policy')} onPress={() => router.push('/privacy-policy' as any)} testID="settings-privacy-policy" last />
        </Card>

        <Card title={t('Session')}>
          <Item icon={<LogOut size={18} color={'#EF4444'} />} label={t('Logout')} onPress={async () => {
            try {
              await logout();
              Alert.alert(t('Signed out'), t('You have been signed out.'));
              router.replace('/(auth)/login' as any);
            } catch (e) {
              Alert.alert(t('Error'), t('Failed to sign out'));
            }
          }} testID="settings-logout" last />
        </Card>
      </View>
    </SafeAreaView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function Item({ icon, label, onPress, testID, last }: { icon: React.ReactNode; label: string; onPress: () => void; testID?: string; last?: boolean }) {
  return (
    <TouchableOpacity style={[styles.item, !last ? styles.itemDivider : null]} onPress={onPress} testID={testID}>
      <View style={styles.itemLeft}>
        <View style={styles.iconWrap}>{icon}</View>
        <Text style={styles.itemLabel}>{label}</Text>
      </View>
      <ChevronRight size={18} color={Colors.text.secondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundSecondary },
  headerWrap: { backgroundColor: 'transparent' },
  headerBg: { height: 140, backgroundColor: Colors.primary },
  headerRow: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: Colors.text.white, fontSize: 18, fontWeight: '700' },
  backBtn: { padding: 6 },
  profileRow: { position: 'absolute', bottom: -32, left: 16, right: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 16, borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: 20, fontWeight: '800', color: Colors.text.white },
  subtitle: { fontSize: 12, color: '#FFE1EA' },
  content: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 24 },
  sectionTitle: { fontSize: 12, color: Colors.text.secondary, marginBottom: 8 },
  card: { marginBottom: 16 },
  cardBody: { backgroundColor: Colors.card, borderRadius: 16, shadowColor: Colors.shadow, shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4, overflow: 'hidden' },
  item: { minHeight: 56, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFF1F5', alignItems: 'center', justifyContent: 'center' },
  itemLabel: { fontSize: 16, color: Colors.text.primary, flexShrink: 1 },
});
