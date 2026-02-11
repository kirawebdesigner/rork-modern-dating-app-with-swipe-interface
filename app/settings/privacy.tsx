import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Switch, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { safeGoBack } from '@/lib/navigation';
import Colors from '@/constants/colors';
import { ArrowLeft } from 'lucide-react-native';
import { useI18n } from '@/hooks/i18n-context';
import GradientButton from '@/components/GradientButton';

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
  const hideLocationDisabled = !(tier === 'gold' || tier === 'vip');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerWrap}>
        <View style={styles.headerBg} />
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => safeGoBack(router, '/settings')} style={styles.backBtn} accessibilityLabel={t('Back')} testID="privacy-back">
            <ArrowLeft size={20} color={Colors.text.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('Privacy')}</Text>
          <View style={{ width: 28 }} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('Visibility')}</Text>
          <View style={styles.cardBody}>
            <Row
              label={t('Private Account')}
              value={privateAccount}
              onValueChange={(v) => { setPrivateAccount(v); }}
            />
            <Row
              label={t('Hide my location (Gold+)')}
              value={hideDistance}
              onValueChange={(v) => setHideDistance(v)}
              disabled={hideLocationDisabled}
            />
            <Row
              label={t('Incognito mode (Gold+)')}
              value={incognito}
              onValueChange={(v) => { if (!hideLocationDisabled) { setIncognito(v); } }}
              disabled={hideLocationDisabled}
            />
          </View>
        </View>

        <View style={{ height: 120 }} />
      </View>

      <View style={styles.footer} testID="save-bar-privacy">
        <GradientButton
          title={t('Save Changes')}
          onPress={async () => {
            await updateProfile({ privacy: { visibility: privateAccount ? 'matches' : 'everyone', hideOnlineStatus: false, incognito } as any });
          }}
          style={styles.saveButton}
        />
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, onValueChange, disabled }: { label: string; value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
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
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'web' ? 20 : 34, backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.border, shadowColor: Colors.shadow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 6 },
  saveButton: { marginTop: 8 },
});
