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
      <View style={styles.headerWrap}>
        <View style={styles.headerBg} />
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/settings' as any); } }} style={styles.backBtn} accessibilityLabel={t('Back')} testID="notifications-back">
            <ArrowLeft size={20} color={Colors.text.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('Notifications')}</Text>
          <View style={{ width: 28 }} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('Push alerts')}</Text>
          <View style={styles.cardBody}>
            <Row label={t('Likes')} value={likes} onValueChange={setLikes} />
            <Row label={t('Matches')} value={matches} onValueChange={setMatches} />
            <Row label={t('Messages')} value={messages} onValueChange={setMessages} />
          </View>
        </View>
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
  container: { flex: 1, backgroundColor: Colors.backgroundSecondary },
  headerWrap: { backgroundColor: 'transparent' },
  headerBg: { height: 140, backgroundColor: Colors.primary },
  headerRow: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: Colors.text.white, fontSize: 18, fontWeight: '700' },
  backBtn: { padding: 6 },
  content: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 24 },
  sectionTitle: { fontSize: 12, color: Colors.text.secondary, marginBottom: 8 },
  card: { marginBottom: 16 },
  cardBody: { backgroundColor: Colors.card, borderRadius: 16, shadowColor: Colors.shadow, shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4, overflow: 'hidden', paddingHorizontal: 12 },
  row: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { color: Colors.text.primary },
});
