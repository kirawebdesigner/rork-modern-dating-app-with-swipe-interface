import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '@/constants/colors';
import { useRouter } from 'expo-router';
import { User, Shield, Bell, Crown, Globe, ChevronRight, ArrowLeft, Share2, Mail } from 'lucide-react-native';
import { useI18n } from '@/hooks/i18n-context';
import * as Linking from 'expo-linking';

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Go back" onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)/profile' as any); } }} testID="settings-back-btn" style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('Settings')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Account')}</Text>
        <Item icon={<User size={18} color={Colors.text.primary} />} label={t('Edit profile')} onPress={() => router.push('/profile-settings' as any)} testID="settings-edit-profile" />
        <Item icon={<User size={18} color={Colors.text.primary} />} label={t('Account settings')} onPress={() => router.push('/settings/account' as any)} testID="settings-account" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Privacy')}</Text>
        <Item icon={<Shield size={18} color={Colors.text.primary} />} label={t('Privacy settings')} onPress={() => router.push('/settings/privacy' as any)} testID="settings-privacy" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Notifications')}</Text>
        <Item icon={<Bell size={18} color={Colors.text.primary} />} label={t('Manage notifications')} onPress={() => router.push('/settings/notifications' as any)} testID="settings-notifications" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Subscription')}</Text>
        <Item icon={<Crown size={18} color={Colors.primary} />} label={t('Upgrade to Premium')} onPress={() => router.push('/premium' as any)} testID="settings-upgrade" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Growth')}</Text>
        <Item icon={<Share2 size={18} color={Colors.text.primary} />} label={t('Share & Get Gold')} onPress={() => router.push('/referrals' as any)} testID="settings-referrals" />
        <Item icon={<Mail size={18} color={Colors.text.primary} />} label={t('Share via Email')} onPress={() => Linking.openURL('mailto:zewijuna1@gmail.com?subject=Feedback&body=Hi,%0D%0A')} testID="settings-share-email" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('App')}</Text>
        <Item icon={<Globe size={18} color={Colors.text.primary} />} label={t('Language')} onPress={() => router.push('/language' as any)} testID="settings-language" />
      </View>
    </SafeAreaView>
  );
}

function Item({ icon, label, onPress, testID }: { icon: React.ReactNode; label: string; onPress: () => void; testID?: string }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} testID={testID}>
      <View style={styles.itemLeft}>
        {icon}
        <Text style={styles.itemLabel}>{label}</Text>
      </View>
      <ChevronRight size={18} color={Colors.text.secondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '600', color: Colors.text.primary, textAlign: 'center', flex: 1 },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 14, color: Colors.text.secondary, marginBottom: 8 },
  item: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemLabel: { fontSize: 16, color: Colors.text.primary },
  backBtn: { padding: 4 },
});
