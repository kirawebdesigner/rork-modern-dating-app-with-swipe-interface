import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, SafeAreaView, Alert, Modal, TextInput, Dimensions, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useMembership } from '@/hooks/membership-context';
import { useApp } from '@/hooks/app-context';
import { MapPin, CheckCircle2, ArrowLeft, Heart, Zap, MessageCircle, Shield, MoreVertical } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useI18n } from '@/hooks/i18n-context';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import { useAuth } from '@/hooks/auth-context';

export default function ProfileDetails() {
  const [complimentOpen, setComplimentOpen] = useState<boolean>(false);
  const [reportOpen, setReportOpen] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [compliment, setCompliment] = useState<string>('');
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { potentialMatches, blockUser } = useApp();
  const { user: me } = useAuth();
  const { remainingProfileViews, tier, useDaily } = useMembership();
  const { t } = useI18n();

  const user: User | undefined = useMemo(() => potentialMatches.find(u => u.id === String(id)), [id, potentialMatches]);

  const hasCountedRef = useRef<boolean>(false);
  useEffect(() => {
    if (user && !hasCountedRef.current) {
      hasCountedRef.current = true;
      // eslint-disable-next-line react-hooks/rules-of-hooks
      void useDaily('views').catch((e) => console.log('[ProfileDetails] view count error', e));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-profile-details">
            <ArrowLeft size={22} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('Profile')}</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.center}> 
          <Text style={styles.subtitle}>{t('Profile not found')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (typeof remainingProfileViews === 'number' && remainingProfileViews <= 0 && tier !== 'vip') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('Upgrade needed')}</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.blockTitle}>{t('Out of views')}</Text>
          <Text style={styles.subtitle}>Upgrade to Silver/Gold or VIP to view more profiles.</Text>
          <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/premium' as any)} testID="see-plans-btn">
            <Shield size={18} color={Colors.text.white} />
            <Text style={styles.upgradeText}>{t('See plans')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { width } = Dimensions.get('window');

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          <View style={styles.heroWrap}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              testID="photos-gallery"
            >
              {user.photos.map((uri) => (
                <Image key={uri} source={{ uri }} style={[styles.heroFull, { width }]} />
              ))}
            </ScrollView>
            <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.6)"]} style={styles.gradientBottom} />
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => router.back()} style={styles.topBack} accessibilityLabel="Go back">
                <ArrowLeft size={22} color={Colors.text.white} />
              </TouchableOpacity>
              <View style={styles.topRight}>
                <TouchableOpacity onPress={() => {
                  Alert.alert(t('Profile options'), undefined, [
                    { text: t('Block user'), onPress: async () => { await blockUser(user.id); Alert.alert(t('Blocked'), `${user.name} ${t('has been blocked')}.`); router.back(); } },
                    { text: t('Report user'), onPress: () => setReportOpen(true) },
                    { text: t('Cancel'), style: 'cancel' },
                  ]);
                }} style={styles.menuBtn} accessibilityLabel="More options">
                  <MoreVertical size={22} color={Colors.text.white} />
                </TouchableOpacity>
                <View style={styles.distancePill}>
                  <MapPin size={14} color={Colors.text.white} />
                  <Text style={styles.distanceText}>2.5 km</Text>
                </View>
              </View>
            </View>

            <View style={styles.nameOverlay}>
              <Text style={styles.nameOverlayText}>{user.name}, {user.age}</Text>
              <Text style={styles.cityText}>{user.location.city}</Text>
              {user.verified ? (
                <View style={styles.verifyBadgeDark}>
                  <CheckCircle2 size={14} color={Colors.success} />
                  <Text style={styles.verifyDarkText}>{t('Verified')}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sectionTitle}>{t('About')}</Text>
            <Text style={styles.bio}>{user.bio}</Text>

            {user.instagram ? (
              <TouchableOpacity style={styles.igButton} onPress={() => Linking.openURL(`https://instagram.com/${user.instagram}`)} testID="open-instagram">
                <Text style={styles.igText}>Instagram @{user.instagram}</Text>
              </TouchableOpacity>
            ) : null}

            {user.interests?.length ? (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.sectionTitle}>{t('Interests')}</Text>
                <View style={styles.interestsWrap}>
                  {user.interests.map((i) => (
                    <View key={i} style={styles.interestChip}><Text style={styles.interestText}>#{i}</Text></View>
                  ))}
                </View>
              </View>
            ) : null}

            <TouchableOpacity style={styles.complimentBtn} onPress={() => setComplimentOpen(true)} testID="send-compliment">
              <Text style={styles.complimentText}>{t('Send a Compliment')}</Text>
            </TouchableOpacity>

            <Modal visible={complimentOpen} animationType="slide" transparent>
              <View style={styles.modalWrap}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>{t('Send a Compliment')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('Write a short, kind message')}
                    placeholderTextColor={Colors.text.light}
                    value={compliment}
                    onChangeText={setCompliment}
                    maxLength={120}
                  />
                  <View style={styles.modalActions}>
                    <TouchableOpacity onPress={() => setComplimentOpen(false)} style={styles.modalBtnSecondary}><Text style={styles.modalBtnText}>{t('Cancel')}</Text></TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        // eslint-disable-next-line react-hooks/rules-of-hooks
                        const ok = await useDaily('compliments');
                        if (!ok) {
                          Alert.alert(t('Limit reached'), tier === 'free' ? t('Free users can send 1 compliment/day. Upgrade to Gold for more.') : t('Limit reached'));
                          return;
                        }
                        Alert.alert(t('Sent'), t('Your compliment was sent.'));
                        setCompliment('');
                        setComplimentOpen(false);
                      }}
                      style={styles.modalBtn}
                    >
                      <Text style={styles.modalBtnTextPrimary}>{t('Send')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            <Modal visible={reportOpen} animationType="fade" transparent>
              <View style={styles.modalWrap}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>{t('Report user')}</Text>
                  <TextInput
                    style={[styles.input, { height: 80 }]}
                    multiline
                    placeholder={t('Describe the issue (spam, fake, harassment, etc.)')}
                    placeholderTextColor={Colors.text.light}
                    value={reportReason}
                    onChangeText={setReportReason}
                    maxLength={300}
                  />
                  <View style={styles.modalActions}>
                    <TouchableOpacity onPress={() => setReportOpen(false)} style={styles.modalBtnSecondary}><Text style={styles.modalBtnText}>{t('Cancel')}</Text></TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          await supabase.from('reports').insert({ reported_id: user.id, reason: reportReason || 'n/a', created_at: new Date().toISOString() });
                          setReportReason('');
                          setReportOpen(false);
                          Alert.alert(t('Thank you'), t('Your report has been submitted.'));
                        } catch {
                          Alert.alert(t('Error'), t('Could not send report. Please try again.'));
                        }
                      }}
                      style={styles.modalBtn}
                    >
                      <Text style={styles.modalBtnTextPrimary}>{t('Submit')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        </ScrollView>

        <View style={styles.stickyCta} testID="sticky-cta">
          <LinearGradient colors={["rgba(255,255,255,0)", Colors.background]} style={styles.stickyGradient} />
          <View style={styles.fabRow}>
            <TouchableOpacity style={[styles.fabBtn, styles.nope]} onPress={() => Alert.alert('Nope', `You passed on ${user.name}`)}>
              <Text style={styles.fabIcon}>×</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.fabBtn, styles.like]} onPress={() => Alert.alert(t('Like'), `You liked ${user.name}`)} testID="like-user">
              <Heart size={24} color={Colors.text.white} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.fabBtn, styles.super]} onPress={() => Alert.alert(t('Super Like'), `You super liked ${user.name}`)}>
              <Zap size={24} color={Colors.text.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fabBtn, styles.message]}
              onPress={async () => {
                try {
                  if (!me?.id) {
                    router.push('/(tabs)/messages' as any);
                    return;
                  }
                  const otherId = user.id;
                  const { data: existingParts } = await supabase
                    .from('conversation_participants')
                    .select('conversation_id')
                    .in('user_id', [me.id, otherId]);

                  let convId: string | null = null;
                  if (existingParts && existingParts.length > 0) {
                    const group = existingParts.reduce<Record<string, number>>((acc, r: any) => {
                      const cid = String(r.conversation_id);
                      acc[cid] = (acc[cid] ?? 0) + 1;
                      return acc;
                    }, {});
                    const found = Object.entries(group).find(([, count]) => count >= 2);
                    if (found) convId = String(found[0]);
                  }

                  if (!convId) {
                    const { data: convIns, error: convErr } = await supabase
                      .from('conversations')
                      .insert({ created_by: me.id })
                      .select('id')
                      .single();
                    if (convErr) throw convErr;
                    convId = String(convIns.id);
                    await supabase.from('conversation_participants').insert([
                      { conversation_id: convId, user_id: me.id },
                      { conversation_id: convId, user_id: otherId },
                    ]);
                  }

                  router.push({ pathname: '/(tabs)/messages/[chatId]', params: { chatId: convId } } as any);
                } catch (e) {
                  console.log('[ProfileDetails] open chat failed', e);
                  router.push('/(tabs)/messages' as any);
                }
              }}
            >
              <MessageCircle size={24} color={Colors.text.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.backgroundSecondary, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', color: Colors.text.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  blockTitle: { fontSize: 22, fontWeight: '700', color: Colors.text.primary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.text.secondary, textAlign: 'center' },
  upgradeBtn: { marginTop: 16, backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  upgradeText: { color: Colors.text.white, fontWeight: '700' },

  heroWrap: { width: '100%', height: 520, position: 'relative' },
  heroFull: { height: '100%', resizeMode: 'cover' },
  gradientBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 220 },
  topBar: { position: 'absolute', top: 20, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  topBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  distancePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 16 },
  distanceText: { color: Colors.text.white, fontWeight: '600' },

  nameOverlay: { position: 'absolute', left: 16, bottom: 24 },
  nameOverlayText: { color: Colors.text.white, fontSize: 28, fontWeight: '800' },
  cityText: { color: '#E5E7EB', marginTop: 4 },
  verifyBadgeDark: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.35)' },
  verifyDarkText: { color: Colors.text.white, fontWeight: '600', fontSize: 12 },

  sheet: { marginTop: -24, backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  sheetHandle: { alignSelf: 'center', width: 48, height: 4, borderRadius: 2, backgroundColor: Colors.border, marginBottom: 12 },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.primary, marginBottom: 8 },
  bio: { fontSize: 16, color: Colors.text.secondary, lineHeight: 24 },
  igButton: { marginTop: 12, backgroundColor: Colors.backgroundSecondary, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  igText: { color: Colors.primary, fontWeight: '700' },

  interestsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  interestChip: { backgroundColor: Colors.backgroundSecondary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 },
  interestText: { color: Colors.text.primary },

  fabRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 0 },
  complimentBtn: { marginTop: 16, backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  complimentText: { color: Colors.text.white, fontWeight: '700' },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', backgroundColor: Colors.background, borderRadius: 16, padding: 16 },
  modalTitle: { color: Colors.text.primary, fontWeight: '700', fontSize: 18, marginBottom: 12 },
  input: { height: 44, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, color: Colors.text.primary, backgroundColor: Colors.card },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  modalBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  modalBtnSecondary: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.backgroundSecondary },
  modalBtnText: { color: Colors.text.primary, fontWeight: '600' },
  modalBtnTextPrimary: { color: Colors.text.white, fontWeight: '700' },
  fabBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  nope: { backgroundColor: '#F3F4F6' },
  like: { backgroundColor: Colors.like },
  super: { backgroundColor: Colors.gradient.start },
  message: { backgroundColor: Colors.primary },
  fabIcon: { color: Colors.text.primary, fontSize: 28, fontWeight: '900', marginTop: -2 },

  stickyCta: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 },
  stickyGradient: { position: 'absolute', left: 0, right: 0, top: -80, height: 120 },
});