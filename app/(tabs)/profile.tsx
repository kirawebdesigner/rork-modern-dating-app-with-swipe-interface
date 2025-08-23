import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Settings,
  Edit3,
  Crown,
  LogOut,
  Coins,
  Star,
  Heart,
  Eye,
  Shield,
  CheckCircle2,
  MapPin,
  Briefcase,
  GraduationCap,
  Instagram,
  Music2,
  MessageCircle,
  ThumbsUp,
  Zap,
  Flag,
  Slash,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/hooks/app-context';
import { useAuth } from '@/hooks/auth-context';
import GradientButton from '@/components/GradientButton';
import { useMembership } from '@/hooks/membership-context';

export default function ProfileScreen() {
  const router = useRouter();
  const { currentProfile } = useApp();
  const { logout } = useAuth();
  const { tier, credits, remainingDailyMessages, remainingProfileViews } = useMembership();

  const isWeb = Platform.OS === 'web';
  console.log('[ProfileScreen] render', { isWeb, tier, credits });

  const handleLogout = async () => {
    console.log('[ProfileScreen] Logout pressed');
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/(auth)' as any);
          } catch (e) {
            console.error('[ProfileScreen] Logout error', e);
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        },
      },
    ]);
  };

  const getTierColor = useCallback(() => {
    switch (tier) {
      case 'vip':
        return '#8B5CF6';
      case 'gold':
        return '#F59E0B';

      default:
        return Colors.text.secondary;
    }
  }, [tier]);

  const getTierIcon = useCallback(() => {
    const color = getTierColor();
    switch (tier) {
      case 'vip':
        return <Star size={16} color={color} fill={color} />;
      case 'gold':
        return <Crown size={16} color={color} />;

      default:
        return null;
    }
  }, [tier, getTierColor]);

  const activityStatus = useMemo(() => {
    const lastVal = currentProfile?.lastActive ?? null;
    const last = lastVal ? new Date(lastVal) : null;
    if (!last) return 'Offline';
    const diffMin = Math.floor((Date.now() - last.getTime()) / 60000);
    if (diffMin < 5) return 'Online now';
    if (diffMin < 60) return `Active ${diffMin}m ago`;
    const hours = Math.floor(diffMin / 60);
    if (hours < 24) return `Active ${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `Active ${days}d ago`;
  }, [currentProfile?.lastActive]);

  const totalCredits = useMemo(() => {
    const m = (currentProfile?.credits?.messages ?? credits.messages) ?? 0;
    const b = (currentProfile?.credits?.boosts ?? credits.boosts) ?? 0;
    const u = (currentProfile?.credits?.unlocks ?? credits.unlocks) ?? 0;
    return m + b + u;
  }, [currentProfile?.credits, credits.messages, credits.boosts, credits.unlocks]);

  if (!currentProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText} testID="profile-empty-title">
            Complete your profile
          </Text>
          <GradientButton
            title="Setup Profile"
            onPress={() => router.push('/profile-setup' as any)}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} testID="profile-scroll">
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/settings' as any)}
            accessibilityLabel="Open settings"
            testID="settings-button"
          >
            <Settings size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/profile-settings' as any)}
            accessibilityLabel="Edit profile"
            testID="edit-profile-button"
          >
            <Edit3 size={24} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.carousel}
            contentContainerStyle={styles.carouselContent}
            testID="profile-photo-carousel"
          >
            {(currentProfile.photos ?? []).map((uri: string, idx: number) => (
              <Image
                key={`${uri}-${idx}`}
                source={{ uri }}
                style={styles.profileImage}
                accessibilityLabel={`Profile photo ${idx + 1}`}
              />
            ))}
          </ScrollView>

          <View style={styles.nameRow}>
            <View style={styles.nameContainer}>
              <Text style={styles.name}>
                {currentProfile.name}, {currentProfile.age}
              </Text>
              <View style={styles.metaRow}>
                {currentProfile.location?.city ? (
                  <View style={styles.metaItem}>
                    <MapPin size={16} color={Colors.text.secondary} />
                    <Text style={styles.metaText}>{currentProfile.location.city}</Text>
                  </View>
                ) : null}
                <Text style={styles.dot}>•</Text>
                <Text style={[styles.metaText, { color: Colors.success }]}>{activityStatus}</Text>
              </View>
            </View>
            <View style={styles.badgesRow}>
              {currentProfile.verified ? (
                <View style={styles.verifyBadge} testID="verify-badge">
                  <CheckCircle2 size={16} color={Colors.success} />
                  <Text style={styles.verifyText}>Verified</Text>
                </View>
              ) : null}
              {tier !== 'free' ? (
                <View style={[styles.tierPill, { borderColor: getTierColor() }]}>
                  {getTierIcon()}
                  <Text style={[styles.tierPillText, { color: getTierColor() }]}>
                    {tier.toUpperCase()}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {tier === 'free' && (
            <TouchableOpacity
              style={styles.premiumBanner}
              onPress={() => router.push('/premium' as any)}
              testID="upgrade-premium"
            >
              <Crown size={20} color={Colors.text.white} />
              <Text style={styles.premiumText}>Upgrade to Premium</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bio} numberOfLines={6}>
            {currentProfile.bio ?? 'Add a short bio to tell others about you.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <View style={styles.interestsContainer}>
            {(currentProfile.interests ?? []).map((interest: string) => (
              <View key={interest} style={styles.interestChip}>
                <Text style={styles.interestText}>#{interest}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Briefcase size={16} color={Colors.text.secondary} />
              <Text style={styles.detailText}>
                {currentProfile.privacy?.incognito ? 'Incognito' : 'Public'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <GraduationCap size={16} color={Colors.text.secondary} />
              <Text style={styles.detailText}>{currentProfile.education ? currentProfile.education : 'Education not set'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social</Text>
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn} disabled>
              <Instagram size={18} color={Colors.text.primary} />
              <Text style={styles.socialText}>Connect Instagram</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn} disabled>
              <Music2 size={18} color={Colors.text.primary} />
              <Text style={styles.socialText}>Connect Spotify</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gallery</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.photosRow}>
              {(currentProfile.photos ?? []).map((photo: string, index: number) => (
                <Image
                  key={index}
                  source={{ uri: photo }}
                  style={styles.photo}
                  accessibilityLabel={`Gallery photo ${index + 1}`}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usage & Credits</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Heart size={20} color={Colors.like} />
              <Text style={styles.statLabel}>Messages</Text>
              <Text style={styles.statValue}>{tier === 'vip' || remainingDailyMessages >= 99999 ? '∞' : remainingDailyMessages}</Text>
            </View>
            <TouchableOpacity style={styles.statItem} onPress={() => router.push('/profile-views' as any)} testID="open-profile-views">
              <Eye size={20} color={Colors.primary} />
              <Text style={styles.statLabel}>Profile Views</Text>
              <Text style={styles.statValue}>{typeof remainingProfileViews === 'number' ? remainingProfileViews : '∞'}</Text>
            </TouchableOpacity>
            <View style={styles.statItem}>
              <Coins size={20} color={Colors.gradient.start} />
              <Text style={styles.statLabel}>Boosts</Text>
              <Text style={styles.statValue}>{credits.boosts}</Text>
            </View>
            <View style={styles.statItem}>
              <Coins size={20} color={Colors.primary} />
              <Text style={styles.statLabel}>Unlocks</Text>
              <Text style={styles.statValue}>{credits.unlocks}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.creditsBanner}
            onPress={() => router.push('/credits' as any)}
            testID="manage-credits-btn"
          >
            <Coins size={18} color={Colors.text.white} />
            <Text style={styles.creditsText}>Manage Credits & Boosts</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.likeBtn]}
              accessibilityLabel="Like"
              testID="like-btn"
              disabled
            >
              <ThumbsUp size={22} color={Colors.text.white} />
              <Text style={styles.actionText}>Like</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.superLikeBtn]}
              accessibilityLabel="Super Like"
              testID="superlike-btn"
              disabled={tier === 'free'}
            >
              <Zap size={22} color={Colors.text.white} />
              <Text style={styles.actionText}>Super Like</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.messageBtn]}
              accessibilityLabel="Message"
              testID="message-btn"
              onPress={() => router.push('/(tabs)/messages' as any)}
            >
              <MessageCircle size={22} color={Colors.text.white} />
              <Text style={styles.actionText}>Message</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.smallIconBtn}
              accessibilityLabel="Block user"
              testID="block-btn"
              disabled
            >
              <Slash size={18} color={Colors.text.secondary} />
              <Text style={styles.smallIconText}>Block</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.smallIconBtn}
              accessibilityLabel="Report user"
              testID="report-btn"
              disabled
            >
              <Flag size={18} color={Colors.text.secondary} />
              <Text style={styles.smallIconText}>Report</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} testID="logout-btn">
          <LogOut size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  carousel: {
    width: '100%',
  },
  carouselContent: {
    paddingHorizontal: 20,
  },
  profileImage: {
    width: 320,
    height: 420,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  nameContainer: {
    alignItems: 'flex-start',
    marginBottom: 4,
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  dot: { fontSize: 14, color: Colors.text.secondary },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gradient.start,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    marginTop: 12,
  },
  premiumText: {
    color: Colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Colors.backgroundSecondary,
  },
  verifyText: {
    fontSize: 12,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Colors.backgroundSecondary,
  },
  tierPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  bio: {
    fontSize: 16,
    color: Colors.text.secondary,
    lineHeight: 24,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  interestText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  photosRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  creditsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.primary,
    borderRadius: 14,
  },
  creditsText: { color: Colors.text.white, fontWeight: '600' },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  likeBtn: { backgroundColor: Colors.like },
  superLikeBtn: { backgroundColor: Colors.gradient.start },
  messageBtn: { backgroundColor: Colors.primary },
  actionText: { color: Colors.text.white, fontWeight: '700' },
  secondaryActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  smallIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallIconText: { fontSize: 12, color: Colors.text.secondary },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
    marginTop: 20,
  },
  logoutText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  socialText: { fontSize: 14, color: Colors.text.primary },
});