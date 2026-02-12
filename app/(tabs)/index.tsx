import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { X, Heart, Star, MapPin, Filter, Rocket, Undo2, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ColorsConst from '@/constants/colors';
import { useI18n } from '@/hooks/i18n-context';
import { useTheme } from '@/hooks/theme-context';
import SwipeCard from '@/components/SwipeCard';
import { useApp } from '@/hooks/app-context';
import { useMembership } from '@/hooks/membership-context';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.25;

export default function DiscoverScreen() {
  const { potentialMatches, swipeUser, filters, swipeHistory } = useApp();
  const { t } = useI18n();
  const { colors } = useTheme();
  const { tier, features, remainingProfileViews, useDaily, remainingRightSwipes, useSuperLike } = useMembership();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const countedViewsRef = useRef<Set<string>>(new Set());
  const position = useRef(new Animated.ValueXY()).current;
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [localSwipedIds, setLocalSwipedIds] = useState<Set<string>>(new Set());
  const [rewindStack, setRewindStack] = useState<string[]>([]);

  const swipedIdsSet = useMemo(() => {
    const set = new Set(localSwipedIds);
    swipeHistory.forEach(s => set.add(s.userId));
    return set;
  }, [localSwipedIds, swipeHistory]);

  const availableProfiles = useMemo(() => {
    return potentialMatches.filter(u => !swipedIdsSet.has(u.id));
  }, [potentialMatches, swipedIdsSet]);

  const currentUser = availableProfiles[0];
  const nextUser = availableProfiles[1];

  const rotate = position.x.interpolate({
    inputRange: [-screenWidth / 2, 0, screenWidth / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, screenWidth / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-screenWidth / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const nextCardScale = position.x.interpolate({
    inputRange: [-screenWidth / 2, 0, screenWidth / 2],
    outputRange: [1, 0.92, 1],
    extrapolate: 'clamp',
  });

  const nextCardOpacity = position.x.interpolate({
    inputRange: [-screenWidth / 2, 0, screenWidth / 2],
    outputRange: [1, 0.6, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    if (currentUser?.id && !countedViewsRef.current.has(currentUser.id)) {
      countedViewsRef.current.add(currentUser.id);
      void useDaily('views').then((ok) => {
        console.log('[Discover] view counted for', currentUser.id, 'ok=', ok);
      }).catch((e) => console.log('[Discover] view count error', e));
    }
  }, [currentUser?.id]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimating,
      onMoveShouldSetPanResponder: () => !isAnimating,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const forceSwipe = useCallback((direction: 'left' | 'right') => {
    setIsAnimating(true);
    const x = direction === 'right' ? screenWidth * 1.5 : -screenWidth * 1.5;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      onSwipeComplete(direction);
    });
  }, [currentUser]);

  const onSwipeComplete = useCallback((direction: 'left' | 'right') => {
    const action = direction === 'right' ? 'like' : 'nope';
    if (currentUser) {
      setLocalSwipedIds(prev => new Set(prev).add(currentUser.id));
      setRewindStack(prev => [currentUser.id, ...prev].slice(0, 50));
      swipeUser(currentUser.id, action);
    }
    position.setValue({ x: 0, y: 0 });
    setIsAnimating(false);
  }, [currentUser, swipeUser, position]);

  const resetPosition = useCallback(() => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      friction: 5,
    }).start();
  }, [position]);

  const showUpgradePrompt = useCallback((feature: string) => {
    Alert.alert(
      'Upgrade Required',
      feature === 'right swipes'
        ? "You're out of likes for today!"
        : `You've reached your limit for ${feature}. Upgrade to ${tier === 'free' ? 'Gold' : 'VIP'} for more!`,
      [
        { text: 'OK', style: 'cancel' },
        { text: 'Upgrade Now', onPress: () => router.push('/premium' as any) },
      ]
    );
  }, [tier, router]);

  const handleActionButton = useCallback(async (action: 'nope' | 'like' | 'superlike') => {
    if (isAnimating || !currentUser) return;

    if (action === 'like' || action === 'superlike') {
      const ok = await useDaily('rightSwipes');
      if (!ok) {
        showUpgradePrompt('right swipes');
        return;
      }
    }

    if (action === 'nope') {
      forceSwipe('left');
    } else if (action === 'like') {
      forceSwipe('right');
    } else {
      if (tier === 'free') {
        showUpgradePrompt('super likes');
        return;
      }
      const ok = await useSuperLike();
      if (!ok) {
        Alert.alert('Out of Super Likes', 'Get more Super Likes in the Store.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Get More', onPress: () => router.push('/premium' as any) },
        ]);
        return;
      }
      setIsAnimating(true);
      Animated.timing(position, {
        toValue: { x: 0, y: -screenWidth },
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setLocalSwipedIds(prev => new Set(prev).add(currentUser.id));
        setRewindStack(prev => [currentUser.id, ...prev].slice(0, 50));
        swipeUser(currentUser.id, 'superlike');
        position.setValue({ x: 0, y: 0 });
        setIsAnimating(false);
      });
    }
  }, [isAnimating, currentUser, useDaily, useSuperLike, tier, showUpgradePrompt, forceSwipe, swipeUser, position, router]);

  const onRewind = useCallback(() => {
    if (!features.rewind) {
      showUpgradePrompt('rewind');
      return;
    }
    const lastId = rewindStack[0];
    if (!lastId) return;
    setLocalSwipedIds(prev => {
      const next = new Set(prev);
      next.delete(lastId);
      return next;
    });
    setRewindStack(prev => prev.slice(1));
  }, [features.rewind, rewindStack, showUpgradePrompt]);

  const viewsLeftText = useMemo(() => {
    if (features.profileViews === 'unlimited') return '∞';
    if (typeof remainingProfileViews === 'number') return String(remainingProfileViews);
    return '∞';
  }, [features.profileViews, remainingProfileViews]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <View style={styles.titleRow}>
            <Text style={styles.title} testID="discover-title">{t('Discover')}</Text>
            <View style={styles.liveDot} />
          </View>
          <View style={styles.locationRow}>
            <MapPin size={13} color="#9CA3AF" testID="icon-location" />
            <Text style={styles.subtitle} numberOfLines={1} testID="discover-location">{filters.locationLabel}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.boostButton}
            onPress={() => router.push('/boost' as any)}
            testID="be-seen"
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF6B6B', '#FF8E53']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.boostGradient}
            >
              <Rocket size={15} color="#FFF" testID="icon-boost" />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => router.push('/discovery-filters' as any)}
            testID="open-filters"
            activeOpacity={0.8}
          >
            <Filter size={18} color="#1A1A1A" testID="icon-filter" />
          </TouchableOpacity>
        </View>
      </View>

      {tier === 'free' && (
        <TouchableOpacity
          style={styles.limitsBanner}
          onPress={() => router.push('/premium' as any)}
          testID="limits-banner"
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#FF2D55', '#FF6B8A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.limitsBannerGradient}
          >
            <Sparkles size={16} color="#FFF" />
            <Text style={styles.limitsText}>
              {typeof remainingRightSwipes === 'number' ? remainingRightSwipes : '∞'} {t('swipes left today')} • {viewsLeftText} {t('views')}
            </Text>
            <Text style={styles.upgradeChip}>{t('Upgrade')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {!currentUser ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Heart size={40} color="#FF2D55" />
          </View>
          <Text style={styles.emptyText}>{t('No more profiles!')}</Text>
          <Text style={styles.emptySubtext}>{t('Check back later for more matches')}</Text>
          <TouchableOpacity
            style={styles.emptyBoostBtn}
            onPress={() => router.push('/premium' as any)}
            testID="empty-upgrade"
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF2D55', '#FF6B8A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.emptyBoostGradient}
            >
              <Rocket size={16} color="#FFF" />
              <Text style={styles.emptyBoostText}>{t('Boost visibility')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.cardsContainer} testID="cards-container" accessibilityLabel="Cards">
            {nextUser && (
              <Animated.View
                style={[
                  styles.cardWrapper,
                  { transform: [{ scale: nextCardScale }], opacity: nextCardOpacity },
                ]}
              >
                <SwipeCard user={nextUser} onPress={() => router.push(`/(tabs)/profile-details/${nextUser.id}` as any)} />
              </Animated.View>
            )}

            <Animated.View
              {...panResponder.panHandlers}
              style={[
                styles.cardWrapper,
                {
                  transform: [
                    { translateX: position.x },
                    { translateY: position.y },
                    { rotate },
                  ],
                },
              ]}
            >
              <SwipeCard user={currentUser} onPress={() => router.push(`/(tabs)/profile-details/${currentUser.id}` as any)} />

              <Animated.View style={[styles.likeLabel, { opacity: likeOpacity }]}>
                <Text style={styles.likeLabelText}>LIKE</Text>
              </Animated.View>

              <Animated.View style={[styles.nopeLabel, { opacity: nopeOpacity }]}>
                <Text style={styles.nopeLabelText}>NOPE</Text>
              </Animated.View>
            </Animated.View>
          </View>

          <View style={styles.actions}>
            {features.rewind && (
              <TouchableOpacity
                style={[styles.actionButtonSmall, styles.rewindBtn]}
                onPress={onRewind}
                testID="rewind-btn"
                activeOpacity={0.8}
              >
                <Undo2 size={22} color="#FFA726" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.nopeBtn]}
              onPress={() => handleActionButton('nope')}
              activeOpacity={0.8}
            >
              <X size={28} color="#FF2D55" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButtonSmall, styles.superBtn]}
              onPress={() => handleActionButton('superlike')}
              activeOpacity={0.8}
            >
              <Star size={22} color="#3B82F6" fill="#3B82F6" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.likeBtn]}
              onPress={() => handleActionButton('like')}
              activeOpacity={0.8}
            >
              <Heart size={28} color="#22C55E" fill="#22C55E" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 10,
  },
  titleWrap: { flexDirection: 'column', flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  subtitle: { fontSize: 13, color: '#9CA3AF', maxWidth: 200, fontWeight: '400' as const },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  boostButton: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  boostGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  limitsBanner: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  limitsBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 8,
  },
  limitsText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  upgradeChip: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#FF2D55',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  cardWrapper: {
    position: 'absolute',
  },
  likeLabel: {
    position: 'absolute',
    top: 50,
    left: 30,
    zIndex: 1000,
    transform: [{ rotate: '-20deg' }],
  },
  likeLabelText: {
    borderWidth: 4,
    fontSize: 34,
    fontWeight: '900' as const,
    padding: 10,
    borderRadius: 8,
    borderColor: '#22C55E',
    color: '#22C55E',
    backgroundColor: 'rgba(34,197,94,0.08)',
    overflow: 'hidden',
  },
  nopeLabel: {
    position: 'absolute',
    top: 50,
    right: 30,
    zIndex: 1000,
    transform: [{ rotate: '20deg' }],
  },
  nopeLabelText: {
    borderWidth: 4,
    fontSize: 34,
    fontWeight: '900' as const,
    padding: 10,
    borderRadius: 8,
    borderColor: '#FF2D55',
    color: '#FF2D55',
    backgroundColor: 'rgba(255,45,85,0.08)',
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
    gap: 16,
  },
  actionButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  actionButtonSmall: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  nopeBtn: {
    borderWidth: 2,
    borderColor: '#FFE5EA',
  },
  likeBtn: {
    borderWidth: 2,
    borderColor: '#DCFCE7',
  },
  superBtn: {
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  rewindBtn: {
    borderWidth: 2,
    borderColor: '#FFF3E0',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFE5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBoostBtn: {
    marginTop: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  emptyBoostGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyBoostText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFF',
  },
});
