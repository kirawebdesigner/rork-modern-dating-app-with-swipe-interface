import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Colors from '@/constants/colors';
import { ArrowLeft, Gift, Link as LinkIcon, CheckCircle2, Mail } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useI18n } from '@/hooks/i18n-context';

export default function ReferralsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [refLink, setRefLink] = useState<string>('');
  const [referredCount, setReferredCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u.user?.id ?? '';
        const { data: p } = await supabase.from('profiles').select('referral_code').eq('id', uid).maybeSingle();
        const code = (p?.referral_code as string | undefined) ?? uid;
        const link = `https://zewijuna.com/join?ref=${code}`;
        setRefLink(link);
        const { count } = await supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', uid);
        setReferredCount(count ?? 0);
      } catch (e) {
        console.log('[Referral] init error', e);
      }
    })();
  }, []);

  const copyLink = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(refLink);
      Alert.alert('Copied', 'Your referral link is copied. Share it with friends!');
    } catch (e) {
      console.log('[Referral] copy error', e);
    }
  }, [refLink]);

  const onShareEmail = useCallback(async () => {
    try {
      const subject = encodeURIComponent('Referral Progress & Feedback');
      const body = encodeURIComponent(`Hi,\n\nHere is my referral link: ${refLink}\n\nPlease check my progress and any feedback.\n\nThanks!`);
      const url = `mailto:zewijuna1@gmail.com?subject=${subject}&body=${body}`;
      await Linking.openURL(url);
    } catch (e) {
      console.log('[Referral] email open failed', e);
    }
  }, [refLink]);

  const checkEligibility = useCallback(async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? '';
      const { count } = await supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', uid);
      const total = count ?? 0;
      setReferredCount(total);
      if (total >= 5) {
        await supabase.from('memberships').update({ tier: 'gold' }).eq('user_id', uid);
        Alert.alert('Congrats!', 'You unlocked 1 month of Gold. Applied to your account.');
      } else {
        Alert.alert('Keep sharing', `You need ${Math.max(0, 5 - total)} more signups to unlock Gold.`);
      }
    } catch (e) {
      console.log('[Referral] check error', e);
    }
  }, []);

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
        <View style={styles.progressWrap}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(100, (referredCount / 5) * 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>{referredCount}/5</Text>
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.checkBtn} onPress={checkEligibility} testID="check-ref-progress">
            <CheckCircle2 size={18} color={Colors.text.white} />
            <Text style={styles.checkText}>Check my progress</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.emailBtn} onPress={onShareEmail} testID="share-email">
            <Mail size={18} color={Colors.primary} />
            <Text style={styles.emailText}>{t('Share via Email')}</Text>
          </TouchableOpacity>
        </View>
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
  progressWrap: { width: '100%', marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBar: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary },
  progressText: { color: Colors.text.primary, fontWeight: '700', minWidth: 40, textAlign: 'right' },
  actionsRow: { flexDirection: 'row', gap: 8, width: '100%', marginTop: 8, alignItems: 'center', justifyContent: 'space-between' },
  checkBtn: { flex: 1, backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  checkText: { color: Colors.text.white, fontWeight: '700' },
  emailBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 },
  emailText: { color: Colors.primary, fontWeight: '700' },
  note: { color: Colors.text.secondary, fontSize: 12, textAlign: 'center' },
});
