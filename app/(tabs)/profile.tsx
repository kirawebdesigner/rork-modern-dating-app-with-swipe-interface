import React, { useMemo, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Settings,
  Edit3,
  Crown,
  LogOut,
  Coins,
  Heart,
  Eye,
  CheckCircle2,
  MapPin,
  GraduationCap,
  ChevronRight,
  Share2,
  Camera,
  Sparkles,
  Shield,
  Zap,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/hooks/app-context';
import { useAuth } from '@/hooks/auth-context';
import GradientButton from '@/components/GradientButton';
import { useMembership } from '@/hooks/membership-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_WIDTH = SCREEN_WIDTH - 48;
const PHOTO_HEIGHT = PHOTO_WIDTH * 1.2;

export default function ProfileScreen() {
  const router = useRouter();
  const { currentProfile } = useApp();
  const { logout } = useAuth();
  const { tier, credits, remainingDailyMessages, remainingProfileViews } = useMembership();
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);

  const isWeb = Platform.OS === 'web';
  console.log('[ProfileScreen] render', { isWeb, tier, credits });

  const handleLogout = useCallback(async () => {
    console.log('[ProfileScreen] Logout pressed');
    if (Platform.OS === 'web') {
      try {
        const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm('Are you sure you want to logout?') : true;
        if (!confirmed) return;
        await logout();
        router.replace('/onboarding' as any);
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            try { window.location.assign('/'); } catch {}
          }, 50);
        }
      } catch (e) {
        console.error('[ProfileScreen] Logout error (web)', e);
        alert('Failed to logout. Please try again.');
      }
      return;
    }

    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/onboarding' as any);
          } catch (e) {
            console.error('[ProfileScreen] Logout error', e);
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        },
      },
    ]);
  }, [logout, router]);

  const tierConfig = useMemo(() => {
    switch (tier) {
      case 'vip':
        return { color: '#8B5CF6', label: 'VIP', icon: <Sparkles size={14} color="#8B5CF6" /> };
      case 'gold':
        return { color: '#F59E0B', label: 'GOLD', icon: <Crown size={14} color="#F59E0B" /> };
      default:
        return null;
    }
  }, [tier]);

  const activityStatus = useMemo(() => {
    const lastVal = currentProfile?.lastActive ?? null;
    const last = lastVal ? new Date(lastVal) : null;
    if (!last) return 'Offline';
    const diffMin = Math.floor((Date.now() - last.getTime()) / 60000);
    if (diffMin < 5) return 'Online';
    if (diffMin < 60) return `${diffMin}m ago`;
    const hours = Math.floor(diffMin / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }, [currentProfile?.lastActive]);

  const photos = useMemo(() => currentProfile?.photos ?? [], [currentProfile?.photos]);

  const onPhotoScroll = useCallback((event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / (PHOTO_WIDTH + 12));
    setActivePhotoIndex(index);
  }, []);

  if (!currentProfile) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Camera size={48} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle} testID="profile-empty-title">Complete Your Profile</Text>
          <Text style={styles.emptySubtitle}>Add photos and details to start matching</Text>
          <GradientButton
            title="Setup Profile"
            onPress={() => router.push('/profile-setup' as any)}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID="profile-scroll"
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={() => router.push('/settings' as any)}
            accessibilityLabel="Open settings"
            testID="settings-button"
          >
            <Settings size={22} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Profile</Text>
          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={() => router.push('/profile-settings' as any)}
            accessibilityLabel="Edit profile"
            testID="edit-profile-button"
          >
            <Edit3 size={22} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.photoSection}>
          <ScrollView
            horizontal
            pagingEnabled={false}
            snapToInterval={PHOTO_WIDTH + 12}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoCarousel}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false, listener: onPhotoScroll }
            )}
            scrollEventThrottle={16}
            testID="profile-photo-carousel"
          >
            {photos.map((uri: string, idx: number) => (
              <View key={`${uri}-${idx}`} style={styles.photoCard}>
                <Image
                  source={{ uri }}
                  style={styles.photo}
                  accessibilityLabel={`Profile photo ${idx + 1}`}
                />
                {idx === 0 && currentProfile.verified && (
                  <View style={styles.verifiedFloating}>
                    <CheckCircle2 size={14} color="#FFF" fill="#22C55E" />
                    <Text style={styles.verifiedFloatingText}>Verified</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
          {photos.length > 1 && (
            <View style={styles.dotsRow}>
              {photos.map((_: string, idx: number) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    idx === activePhotoIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {currentProfile.name}, {currentProfile.age}
            </Text>
            {tierConfig && (
              <View style={[styles.tierBadge, { backgroundColor: tierConfig.color + '15', borderColor: tierConfig.color + '30' }]}>
                {tierConfig.icon}
                <Text style={[styles.tierBadgeText, { color: tierConfig.color }]}>{tierConfig.label}</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            {currentProfile.location?.city ? (
              <View style={styles.metaChip}>
                <MapPin size={13} color={Colors.text.secondary} />
                <Text style={styles.metaChipText}>{currentProfile.location.city}</Text>
              </View>
            ) : null}
            {currentProfile.education ? (
              <View style={styles.metaChip}>
                <GraduationCap size={13} color={Colors.text.secondary} />
                <Text style={styles.metaChipText}>{currentProfile.education}</Text>
              </View>
            ) : null}
            <View style={[styles.metaChip, styles.statusChip]}>
              <View style={[styles.statusDot, activityStatus === 'Online' && styles.statusOnline]} />
              <Text style={styles.metaChipText}>{activityStatus}</Text>
            </View>
          </View>
        </View>

        {tier === 'free' && (
          <TouchableOpacity
            style={styles.upgradeCard}
            onPress={() => router.push('/premium' as any)}
            activeOpacity={0.85}
            testID="upgrade-premium"
          >
            <LinearGradient
              colors={['#FF2D55', '#FF6B8A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeGradient}
            >
              <View style={styles.upgradeLeft}>
                <Crown size={24} color="#FFF" />
                <View>
                  <Text style={styles.upgradeTitle}>Go Premium</Text>
                  <Text style={styles.upgradeSubtitle}>Unlimited likes, messages & more</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {currentProfile.bio ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>About me</Text>
            <Text style={styles.bioText}>{currentProfile.bio}</Text>
          </View>
        ) : null}

        {(currentProfile.interests ?? []).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Interests</Text>
            <View style={styles.tagsWrap}>
              {(currentProfile.interests ?? []).map((interest: string) => (
                <View key={interest} style={styles.tag}>
                  <Text style={styles.tagText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Stats & Credits</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                <Heart size={18} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>
                {tier === 'vip' || remainingDailyMessages >= 99999 ? '∞' : remainingDailyMessages}
              </Text>
              <Text style={styles.statLabel}>Messages</Text>
            </View>
            <TouchableOpacity
              style={styles.statCell}
              onPress={() => router.push('/profile-views' as any)}
              testID="open-profile-views"
            >
              <View style={[styles.statIcon, { backgroundColor: '#EDE9FE' }]}>
                <Eye size={18} color="#8B5CF6" />
              </View>
              <Text style={styles.statValue}>
                {typeof remainingProfileViews === 'number' ? remainingProfileViews : '∞'}
              </Text>
              <Text style={styles.statLabel}>Views</Text>
            </TouchableOpacity>
            <View style={styles.statCell}>
              <View style={[styles.statIcon, { backgroundColor: '#FFF1F3' }]}>
                <Zap size={18} color="#FF2D55" />
              </View>
              <Text style={styles.statValue}>{tier === 'vip' ? '∞' : credits.boosts}</Text>
              <Text style={styles.statLabel}>Boosts</Text>
            </View>
            <View style={styles.statCell}>
              <View style={[styles.statIcon, { backgroundColor: '#ECFDF5' }]}>
                <Coins size={18} color="#22C55E" />
              </View>
              <Text style={styles.statValue}>{tier === 'vip' ? '∞' : credits.unlocks}</Text>
              <Text style={styles.statLabel}>Unlocks</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/referrals' as any)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FFF8E1' }]}>
              <Share2 size={20} color="#F59E0B" />
            </View>
            <View style={styles.quickActionText}>
              <Text style={styles.quickActionTitle}>Invite Friends</Text>
              <Text style={styles.quickActionSub}>Get Gold for free</Text>
            </View>
            <ChevronRight size={18} color={Colors.text.light} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/settings/security' as any)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#EDE9FE' }]}>
              <Shield size={20} color="#8B5CF6" />
            </View>
            <View style={styles.quickActionText}>
              <Text style={styles.quickActionTitle}>Security</Text>
              <Text style={styles.quickActionSub}>Biometric & 2FA</Text>
            </View>
            <ChevronRight size={18} color={Colors.text.light} />
          </TouchableOpacity>
        </View>

        {photos.length > 1 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Gallery</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.galleryRow}>
                {photos.map((photo: string, index: number) => (
                  <Image
                    key={index}
                    source={{ uri: photo }}
                    style={styles.galleryThumb}
                    accessibilityLabel={`Gallery photo ${index + 1}`}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <TouchableOpacity
          style={styles.logoutRow}
          onPress={handleLogout}
          testID="logout-btn"
          accessibilityRole="button"
          accessibilityLabel="Logout"
        >
          <LogOut size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FA',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 12,
    backgroundColor: '#F8F8FA',
  },
  topBarBtn: {
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
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  photoSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  photoCarousel: {
    gap: 12,
  },
  photoCard: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  verifiedFloating: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  verifiedFloatingText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  infoSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  name: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  metaChipText: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '500' as const,
  },
  statusChip: {
    backgroundColor: '#ECFDF5',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  statusOnline: {
    backgroundColor: '#22C55E',
  },
  upgradeCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#FF2D55',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  upgradeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  upgradeTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  upgradeSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  card: {
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text.secondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  bioText: {
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    color: Colors.text.primary,
    fontWeight: '500' as const,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    fontWeight: '500' as const,
  },
  quickActions: {
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: '#FFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  quickActionSub: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  galleryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  galleryThumb: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 16,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFF1F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
});
