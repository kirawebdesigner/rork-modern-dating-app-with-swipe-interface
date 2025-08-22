import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { ArrowLeft } from 'lucide-react-native';
import { useI18n } from '@/hooks/i18n-context';

import { useMembership } from '@/hooks/membership-context';
import { useApp } from '@/hooks/app-context';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { tier } = useMembership();
  const { updateProfile } = useApp();
  const [blurFreeLikes, setBlurFreeLikes] = useState<boolean>(true);
  const [hideDistance, setHideDistance] = useState<boolean>(false);
  const [incognito, setIncognito] = useState<boolean>(false);
  const [privateAccount, setPrivateAccount] = useState<boolean>(false);
  const hideLocationDisabled = !(tier === 'gold' || tier === 'vip');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/settings' as any); } }} style={styles.backBtn} accessibilityLabel={t('Back')} testID="privacy-back">
          <ArrowLeft size={20} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('Privacy')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.section}>
        <Row
          label={t('Private Account')}
          value={privateAccount}
          onValueChange={(v) => { setPrivateAccount(v); updateProfile({ privacy: { visibility: v ? 'matches' : 'everyone', hideOnlineStatus: false, incognito } as any }); }}
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
          onValueChange={(v) => { if (!hideLocationDisabled) { setIncognito(v); updateProfile({ privacy: { visibility: privateAccount ? 'matches' : 'everyone', hideOnlineStatus: false, incognito: v } as any }); } }}
          disabled={hideLocationDisabled}
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text.primary },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  row: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { color: Colors.text.primary },
});
