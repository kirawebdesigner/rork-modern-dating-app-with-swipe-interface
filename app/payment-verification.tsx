import React, { useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, SafeAreaView, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Colors from '@/constants/colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { MembershipTier } from '@/types';

export default function PaymentVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const paramTier = (typeof params?.tier === 'string' ? params.tier : undefined) as MembershipTier | undefined;
  const validTier: MembershipTier | undefined = useMemo(() => (paramTier && ['free','silver','gold','vip'].includes(paramTier) ? paramTier : undefined) as MembershipTier | undefined, [paramTier]);

  const TELEBIRR_NUMBER = '0944120739';
  const TELEBIRR_NAME = 'Tesnim meftuh';
  const TELEGRAM_DEEPLINK = 'tg://msg?to=0944120739';

  const USD_TO_ETB = 160;
  const priceUSD: Record<Exclude<MembershipTier,'free'>, number> = {
    silver: 9.99,
    gold: 19.99,
    vip: 29.99,
  };
  const planPriceETB = useMemo(() => {
    if (!validTier || validTier === 'free') return null;
    const usd = priceUSD[validTier];
    return Math.round(usd * USD_TO_ETB);
  }, [validTier]);

  useEffect(() => {}, []);

  const onTelegram = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(TELEBIRR_NUMBER);
      const supported = await Linking.canOpenURL(TELEGRAM_DEEPLINK);
      if (supported) {
        await Linking.openURL(TELEGRAM_DEEPLINK);
      } else {
        Alert.alert('Number copied', 'Open Telegram and message the number with your email + screenshot.');
      }
    } catch (e) {
      Alert.alert('Copied', 'Phone number copied to clipboard. Open Telegram and message us.');
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/premium' as any); }} testID="back-btn" style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerRow}>
        <Image
          source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/bdshjzcr8c9zb8mhnshfy' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Manual Payment</Text>
          <Text style={styles.subtitle}>Pay with Telebirr and send proof via Telegram.</Text>
          {validTier && validTier !== 'free' && (
            <Text style={styles.planHint} testID="selected-plan">Selected plan: {validTier.toUpperCase()} — Pay {planPriceETB} ETB</Text>
          )}
        </View>
      </View>

      <View style={styles.box}>
        <Text style={styles.label}>Telebirr Number</Text>
        <Text style={styles.value}>{TELEBIRR_NUMBER}</Text>
        <Text style={styles.value}>Name: {TELEBIRR_NAME}</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Clipboard.setStringAsync(TELEBIRR_NUMBER)} testID="copy-number">
            <Text style={styles.actionText}>Copy Number</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.telegramBtn]} onPress={onTelegram} testID="open-telegram">
            <Text style={[styles.actionText, { color: Colors.text.white }]}>Open Telegram</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.help}>
        After paying {validTier && validTier !== 'free' ? `${planPriceETB} ETB` : 'the amount'}, send your payment screenshot and your phone number (the one you used to register) via Telegram to {TELEBIRR_NUMBER} ({TELEBIRR_NAME}). Admin will approve within 12 hours.
      </Text>

      <TouchableOpacity style={styles.doneBtn} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/profile' as any); }} testID="done-btn">
        <Text style={styles.doneText}>I sent it on Telegram</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20 },
  topBar: { paddingBottom: 8 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border },
  backText: { color: Colors.text.primary, fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  logo: { width: 44, height: 44, borderRadius: 8, marginRight: 6, backgroundColor: 'white' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text.primary },
  subtitle: { color: Colors.text.secondary, marginTop: 2 },
  planHint: { color: Colors.text.primary, fontWeight: '700', marginTop: 6 },
  box: { marginTop: 16, backgroundColor: Colors.backgroundSecondary, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  label: { color: Colors.text.secondary, fontSize: 12 },
  value: { color: Colors.text.primary, fontWeight: '700', marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: { flex: 1, backgroundColor: Colors.card, padding: 10, borderRadius: 10, alignItems: 'center' },
  actionText: { color: Colors.text.primary, fontWeight: '700' },
  telegramBtn: { backgroundColor: '#2AABEE' },
  help: { color: Colors.text.secondary, marginTop: 16 },
  doneBtn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  doneText: { color: Colors.text.white, fontWeight: '700' },
});
