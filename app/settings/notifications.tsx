import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { ArrowLeft } from 'lucide-react-native';
import { useI18n } from '@/hooks/i18n-context';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [likes, setLikes] = useState<boolean>(true);
  const [matches, setMatches] = useState<boolean>(true);
  const [messages, setMessages] = useState<boolean>(true);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/settings' as any); } }} style={styles.backBtn} accessibilityLabel={t('Back')} testID="notifications-back">
          <ArrowLeft size={20} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('Notifications')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.section}>
        <Row label={t('Likes')} value={likes} onValueChange={setLikes} />
        <Row label={t('Matches')} value={matches} onValueChange={setMatches} />
        <Row label={t('Messages')} value={messages} onValueChange={setMessages} />
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} testID={`switch-${label}`} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text.primary },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  row: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { color: Colors.text.primary },
});
