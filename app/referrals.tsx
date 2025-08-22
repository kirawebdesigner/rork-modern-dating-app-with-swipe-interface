import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import Colors from '@/constants/colors';
import { ArrowLeft, Gift, Link as LinkIcon, CheckCircle2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';

export default function ReferralsScreen() {
  const router = useRouter();
  const [refLink, setRefLink] = useState<string>('');
  const [referredCount, setReferredCount] = useState<number>(0);

  useEffect(() => {
    const id = 'current';
    const link = `https://zewijuna.com/join?ref=${id}`;
    setRefLink(link);
  }, []);

  const copyLink = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(refLink);
      Alert.alert('Copied', 'Your referral link is copied. Share it with friends!');
    } catch (e) {
      console.log('[Referral] copy error', e);
    }
  }, [refLink]);

  const checkEligibility = useCallback(async () => {
    try {
      setReferredCount(0);
      if (referredCount >= 5) {
        Alert.alert('Congrats!', 'You unlocked 1 month of Gold. It will be applied to your account.');
      } else {
        Alert.alert('Keep sharing', `You need ${Math.max(0, 5 - referredCount)} more signups to unlock Gold.`);
      }
    } catch (e) {
      console.log('[Referral] check error', e);
    }
  }, [referredCount]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/settings' as any); } }} style={styles.backBtn} testID="referrals-back">
          <ArrowLeft size={20} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Share & Get Gold</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.card}>
        <Gift size={36} color={Colors.primary} />
        <Text style={styles.headline}>Invite 5 friends and get 1 month of Gold</Text>
        <TouchableOpacity style={styles.linkRow} onPress={copyLink} testID="copy-ref-link">
          <Text style={styles.linkText} numberOfLines={1}>{refLink}</Text>
          <LinkIcon size={16} color={Colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.checkBtn} onPress={checkEligibility}>
          <CheckCircle2 size={18} color={Colors.text.white} />
          <Text style={styles.checkText}>Check my progress</Text>
        </TouchableOpacity>
        <Text style={styles.note}>We track signups from your link. When it reaches 5, your account is upgraded automatically.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text.primary },
  card: { margin: 20, borderRadius: 16, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 12, alignItems: 'center' },
  headline: { color: Colors.text.primary, fontWeight: '700', fontSize: 16, textAlign: 'center' },
  linkRow: { width: '100%', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  linkText: { color: Colors.text.primary, flex: 1, marginRight: 8 },
  checkBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkText: { color: Colors.text.white, fontWeight: '700' },
  note: { color: Colors.text.secondary, fontSize: 12, textAlign: 'center' },
});
