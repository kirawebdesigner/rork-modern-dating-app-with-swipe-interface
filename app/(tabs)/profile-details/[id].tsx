import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useMembership } from '@/hooks/membership-context';
import { useApp } from '@/hooks/app-context';
import {
  MapPin,
  ChevronLeft,
  Heart,
  X,
  Star,
  Send,
  Shield,
  MoreVertical,
  CheckCheck,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useI18n } from '@/hooks/i18n-context';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import { useAuth } from '@/hooks/auth-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_WIDTH * 1.15;
const ACTION_BTN_SIZE = 56;
const ACTION_BTN_MAIN = 72;

export default function ProfileDetails() {
  const [complimentOpen, setComplimentOpen] = useState<boolean>(false);
  const [reportOpen, setReportOpen] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [compliment, setCompliment] = useState<string>('');
  const [bioExpanded, setBioExpanded] = useState<boolean>(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { potentialMatches, blockUser, swipeUser } = useApp();
  const { user: me } = useAuth();
  const { remainingProfileViews, tier, useDaily } = useMembership();
  const { t } = useI18n();

  const user: User | undefined = useMemo(
    () => potentialMatches.find((u) => u.id === String(id)),
    [id, potentialMatches],
  );

  const hasCountedRef = useRef<boolean>(false);
  useEffect(() => {
    if (user && !hasCountedRef.current) {
      hasCountedRef.current = true;
      void useDaily('views').catch((e: unknown) =>
        console.log('[ProfileDetails] view count error', e),
      );
    }
  }, [user]);

  const handleBack = useCallback(() => {
    try {
      router.back();
    } catch {
      router.replace('/(tabs)' as any);
    }
  }, [router]);

  const handleLike = useCallback(() => {
    if (!user) return;
    swipeUser(user.id, 'like');
    Alert.alert(t('Liked!'), `${t('You liked')} ${user.name}`);
    handleBack();
  }, [user, swipeUser, t, handleBack]);

  const handleNope = useCallback(() => {
    if (!user) return;
    swipeUser(user.id, 'nope');
    handleBack();
  }, [user, swipeUser, handleBack]);

  const handleSuperLike = useCallback(() => {
    if (!user) return;
    swipeUser(user.id, 'superlike');
    Alert.alert(t('Super Liked!'), `${t('You super liked')} ${user.name}`);
    handleBack();
  }, [user, swipeUser, t, handleBack]);

  const handleMessage = useCallback(async () => {
    if (!user || !me?.id) {
      router.push('/(tabs)/messages' as any);
      return;
    }
    try {
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

      router.push({
        pathname: '/(tabs)/messages/[chatId]',
        params: { chatId: convId },
      } as any);
    } catch (e) {
      console.log('[ProfileDetails] open chat failed', e);
      router.push('/(tabs)/messages' as any);
    }
  }, [user, me, router]);

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtnLight} testID="back-profile-details">
            <ChevronLeft size={24} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>{t('Profile not found')}</Text>
          <Text style={styles.emptySubtitle}>{t('This profile may no longer be available')}</Text>
        </View>
      </View>
    );
  }

  if (typeof remainingProfileViews === 'number' && remainingProfileViews <= 0 && tier !== 'vip') {
    return (
      <View style={styles.container}>
        <View style={styles.emptyHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtnLight}>
            <ChevronLeft size={24} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Shield size={48} color={Colors.primary} />
          <Text style={styles.emptyTitle}>{t('Out of views')}</Text>
          <Text style={styles.emptySubtitle}>
            Upgrade to Silver/Gold or VIP to view more profiles.
          </Text>
          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => router.push('/premium' as any)}
            testID="see-plans-btn"
          >
            <Text style={styles.upgradeBtnText}>{t('See plans')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const bioText = user.bio || '';
  const shouldTruncateBio = bioText.length > 120;
  const displayBio = bioExpanded ? bioText : bioText.slice(0, 120);

  const distanceText = user.location.distance
    ? `${user.location.distance} km`
    : '1 km';

  const highlightedInterests = (user.interests ?? []).slice(0, 2);
  const normalInterests = (user.interests ?? []).slice(2);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.heroContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActivePhotoIndex(idx);
            }}
            testID="photos-gallery"
          >
            {user.photos.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {user.photos.length > 1 && (
            <View style={styles.photoIndicators}>
              {user.photos.map((_, idx) => (
                <View
                  key={`indicator-${idx}`}
                  style={[
                    styles.photoIndicator,
                    idx === activePhotoIndex && styles.photoIndicatorActive,
                  ]}
                />
              ))}
            </View>
          )}

          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent']}
            style={styles.topGradient}
          />

          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            accessibilityLabel="Go back"
            testID="back-profile-details"
          >
            <ChevronLeft size={24} color="#1A1A1A" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Alert.alert(t('Profile options'), undefined, [
                {
                  text: t('Block user'),
                  onPress: async () => {
                    await blockUser(user.id);
                    Alert.alert(t('Blocked'), `${user.name} ${t('has been blocked')}.`);
                    handleBack();
                  },
                },
                { text: t('Report user'), onPress: () => setReportOpen(true) },
                { text: t('Cancel'), style: 'cancel' },
              ]);
            }}
            style={styles.menuBtn}
            accessibilityLabel="More options"
          >
            <MoreVertical size={20} color="#1A1A1A" />
          </TouchableOpacity>

          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.95)', '#FFFFFF']}
            style={styles.bottomGradient}
          />

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSmall]}
              onPress={handleNope}
              activeOpacity={0.8}
            >
              <X size={26} color="#F97316" strokeWidth={3} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnMain]}
              onPress={handleLike}
              activeOpacity={0.8}
              testID="like-user"
            >
              <LinearGradient
                colors={['#FF4D67', '#E8395B']}
                style={styles.mainBtnGradient}
              >
                <Heart size={32} color="#FFFFFF" fill="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSmall]}
              onPress={handleSuperLike}
              activeOpacity={0.8}
            >
              <Star size={24} color="#8B5CF6" fill="#8B5CF6" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <View style={styles.nameLeft}>
              <Text style={styles.userName}>
                {user.name}, {user.age}
              </Text>
              {user.education && (
                <Text style={styles.profession}>{user.education}</Text>
              )}
              {!user.education && user.bio && (
                <Text style={styles.profession} numberOfLines={1}>
                  {user.bio.slice(0, 40)}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={handleMessage}
              activeOpacity={0.7}
            >
              <Send size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.locationSection}>
            <Text style={styles.sectionLabel}>{t('Location')}</Text>
            <View style={styles.locationRow}>
              <Text style={styles.locationText}>
                {user.location.city || 'Unknown'}
              </Text>
              <View style={styles.distanceBadge}>
                <MapPin size={12} color={Colors.primary} />
                <Text style={styles.distanceText}>{distanceText}</Text>
              </View>
            </View>
          </View>

          {bioText.length > 0 && (
            <View style={styles.aboutSection}>
              <Text style={styles.sectionLabel}>{t('About')}</Text>
              <Text style={styles.aboutText}>
                {displayBio}
                {shouldTruncateBio && !bioExpanded ? '..' : ''}
              </Text>
              {shouldTruncateBio && (
                <TouchableOpacity onPress={() => setBioExpanded(!bioExpanded)}>
                  <Text style={styles.readMore}>
                    {bioExpanded ? t('Show less') : t('Read more')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {(user.interests ?? []).length > 0 && (
            <View style={styles.interestsSection}>
              <Text style={styles.sectionLabel}>{t('Interests')}</Text>
              <View style={styles.interestsWrap}>
                {highlightedInterests.map((interest) => (
                  <View key={interest} style={styles.interestChipHighlighted}>
                    <CheckCheck size={14} color={Colors.primary} />
                    <Text style={styles.interestTextHighlighted}>{interest}</Text>
                  </View>
                ))}
                {normalInterests.map((interest) => (
                  <View key={interest} style={styles.interestChip}>
                    <Text style={styles.interestText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {user.photos.length > 1 && (
            <View style={styles.gallerySection}>
              <View style={styles.galleryHeader}>
                <Text style={styles.sectionLabel}>{t('Gallery')}</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAll}>{t('See all')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.galleryGrid}>
                {user.photos.slice(0, 2).map((uri, idx) => (
                  <Image
                    key={`gallery-lg-${idx}`}
                    source={{ uri }}
                    style={styles.galleryImageLarge}
                    resizeMode="cover"
                  />
                ))}
              </View>
              {user.photos.length > 2 && (
                <View style={styles.galleryGridSmall}>
                  {user.photos.slice(2, 5).map((uri, idx) => (
                    <Image
                      key={`gallery-sm-${idx}`}
                      source={{ uri }}
                      style={styles.galleryImageSmall}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {user.instagram && (
            <TouchableOpacity
              style={styles.igButton}
              onPress={() => Linking.openURL(`https://instagram.com/${user.instagram}`)}
              testID="open-instagram"
            >
              <Text style={styles.igText}>Instagram @{user.instagram}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.complimentBtn}
            onPress={() => setComplimentOpen(true)}
            testID="send-compliment"
          >
            <Text style={styles.complimentBtnText}>{t('Send a Compliment')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
              <TouchableOpacity
                onPress={() => setComplimentOpen(false)}
                style={styles.modalBtnSecondary}
              >
                <Text style={styles.modalBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  const ok = await useDaily('compliments');
                  if (!ok) {
                    Alert.alert(
                      t('Limit reached'),
                      tier === 'free'
                        ? t('Free users can send 1 compliment/day. Upgrade to Gold for more.')
                        : t('Limit reached'),
                    );
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
              <TouchableOpacity
                onPress={() => setReportOpen(false)}
                style={styles.modalBtnSecondary}
              >
                <Text style={styles.modalBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await supabase.from('reports').insert({
                      reported_id: user.id,
                      reason: reportReason || 'n/a',
                      created_at: new Date().toISOString(),
                    });
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
  );
}

const GALLERY_GAP = 8;
const GALLERY_LARGE_WIDTH = (SCREEN_WIDTH - 40 - GALLERY_GAP) / 2;
const GALLERY_SMALL_WIDTH = (SCREEN_WIDTH - 40 - GALLERY_GAP * 2) / 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  emptyHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
  },
  backBtnLight: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },
  upgradeBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  upgradeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
    fontSize: 15,
  },

  heroContainer: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    position: 'relative' as const,
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },
  photoIndicators: {
    position: 'absolute' as const,
    top: Platform.OS === 'ios' ? 56 : 36,
    left: 20,
    right: 20,
    flexDirection: 'row' as const,
    gap: 4,
  },
  photoIndicator: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  photoIndicatorActive: {
    backgroundColor: '#FFFFFF',
  },
  topGradient: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  backBtn: {
    position: 'absolute' as const,
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  menuBtn: {
    position: 'absolute' as const,
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bottomGradient: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  actionButtonsRow: {
    position: 'absolute' as const,
    bottom: -28,
    left: 0,
    right: 0,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'flex-end' as const,
    gap: 16,
    zIndex: 10,
  },
  actionBtn: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  actionBtnSmall: {
    width: ACTION_BTN_SIZE,
    height: ACTION_BTN_SIZE,
    borderRadius: ACTION_BTN_SIZE / 2,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  actionBtnMain: {
    width: ACTION_BTN_MAIN,
    height: ACTION_BTN_MAIN,
    borderRadius: ACTION_BTN_MAIN / 2,
    overflow: 'hidden' as const,
  },
  mainBtnGradient: {
    width: ACTION_BTN_MAIN,
    height: ACTION_BTN_MAIN,
    borderRadius: ACTION_BTN_MAIN / 2,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  nameRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
  },
  nameLeft: {
    flex: 1,
    marginRight: 16,
  },
  userName: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  profession: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF1F3',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#FFE1EA',
  },

  locationSection: {
    marginTop: 24,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  locationText: {
    fontSize: 15,
    color: '#6B7280',
  },
  distanceBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },

  aboutSection: {
    marginTop: 24,
  },
  aboutText: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 23,
  },
  readMore: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginTop: 6,
  },

  interestsSection: {
    marginTop: 24,
  },
  interestsWrap: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  interestChipHighlighted: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: '#FFF1F3',
  },
  interestTextHighlighted: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  interestChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  interestText: {
    fontSize: 14,
    color: '#4B5563',
  },

  gallerySection: {
    marginTop: 28,
  },
  galleryHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  galleryGrid: {
    flexDirection: 'row' as const,
    gap: GALLERY_GAP,
  },
  galleryImageLarge: {
    width: GALLERY_LARGE_WIDTH,
    height: GALLERY_LARGE_WIDTH * 1.3,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  galleryGridSmall: {
    flexDirection: 'row' as const,
    gap: GALLERY_GAP,
    marginTop: GALLERY_GAP,
  },
  galleryImageSmall: {
    width: GALLERY_SMALL_WIDTH,
    height: GALLERY_SMALL_WIDTH * 1.3,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },

  igButton: {
    marginTop: 20,
    backgroundColor: '#FFF1F3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE1EA',
  },
  igText: {
    color: Colors.primary,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  complimentBtn: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center' as const,
  },
  complimentBtnText: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
    fontSize: 15,
  },

  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 20,
  },
  modalCard: {
    width: '100%' as const,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    color: Colors.text.primary,
    fontWeight: '700' as const,
    fontSize: 18,
    marginBottom: 12,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: Colors.text.primary,
    backgroundColor: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    gap: 12,
    marginTop: 12,
  },
  modalBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalBtnSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  modalBtnText: {
    color: Colors.text.primary,
    fontWeight: '600' as const,
  },
  modalBtnTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
});
