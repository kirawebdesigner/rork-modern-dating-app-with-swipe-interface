import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { safeGoBack } from '@/lib/navigation';
import Colors from '@/constants/colors';
import { ArrowLeft, Heart, Users, MessageCircle } from 'lucide-react-native';
import { useI18n } from '@/hooks/i18n-context';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [likes, setLikes] = useState<boolean>(true);
  const [matches, setMatches] = useState<boolean>(true);
  const [messages, setMessages] = useState<boolean>(true);

  const handleSave = () => {
    Alert.alert(t('Saved'), t('Notification preferences updated'));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack(router, '/settings')} style={styles.backBtn} accessibilityLabel={t('Back')} testID="notifications-back">
          <ArrowLeft size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Notifications')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>{t('Push Alerts')}</Text>
        <View style={styles.card}>
          <NotifRow
            icon={<Heart size={18} color="#FF2D55" />}
            iconBg="#FFF1F3"
            label={t('Likes')}
            subtitle={t('When someone likes your profile')}
            value={likes}
            onValueChange={setLikes}
          />
          <View style={styles.divider} />
          <NotifRow
            icon={<Users size={18} color="#8B5CF6" />}
            iconBg="#EDE9FE"
            label={t('Matches')}
            subtitle={t('When you match with someone')}
            value={matches}
            onValueChange={setMatches}
          />
          <View style={styles.divider} />
          <NotifRow
            icon={<MessageCircle size={18} color="#3B82F6" />}
            iconBg="#EFF6FF"
            label={t('Messages')}
            subtitle={t('New message notifications')}
            value={messages}
            onValueChange={setMessages}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>{t('Save Changes')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NotifRow({ icon, iconBg, label, subtitle, value, onValueChange }: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} testID={`switch-${label}`} />
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
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
  rowLabel: { fontSize: 15, fontWeight: '600' as const, color: Colors.text.primary },
  rowSubtitle: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 68 },
  saveBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#FFF', fontWeight: '700' as const, fontSize: 16 },
});
