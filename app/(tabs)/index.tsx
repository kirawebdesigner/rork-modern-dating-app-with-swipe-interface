import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { X, Heart, Star, MapPin, Filter, Rocket, Undo2 } from 'lucide-react-native';
import ColorsConst from '@/constants/colors';
import { useI18n } from '@/hooks/i18n-context';
import { useTheme } from '@/hooks/theme-context';
import SwipeCard from '@/components/SwipeCard';
import { useApp } from '@/hooks/app-context';
import { useMembership } from '@/hooks/membership-context';
import { useRouter } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.25;

export default function DiscoverScreen() {
  const { potentialMatches, swipeUser, filters } = useApp();
  const { t } = useI18n();
  const { colors } = useTheme();
  const { tier, features, remainingProfileViews, useDaily, remainingRightSwipes, useSuperLike } = useMembership();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const countedViewsRef = useRef<Set<string>>(new Set());
  const position = useRef(new Animated.ValueXY()).current;
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [history, setHistory] = useState<string[]>([]);

  const currentUser = potentialMatches[currentIndex];
  const nextUser = potentialMatches[currentIndex + 1];

  const rotate = position.x.interpolate({
    inputRange: [-screenWidth / 2, 0, screenWidth / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
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
    outputRange: [1, 0.95, 1],
    extrapolate: 'clamp',
  });

  React.useEffect(() => {
    if (currentUser?.id && !countedViewsRef.current.has(currentUser.id)) {
      countedViewsRef.current.add(currentUser.id);
      useDaily('views').then((ok) => {
        console.log('[Discover] view counted for', currentUser.id, 'ok=', ok);
      }).catch((e) => console.log('[Discover] view count error', e));
    }
  }, [currentUser?.id, useDaily]);

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

  const forceSwipe = (direction: 'left' | 'right') => {
    setIsAnimating(true);
    const x = direction === 'right' ? screenWidth : -screenWidth;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      onSwipeComplete(direction);
    });
  };

  const onSwipeComplete = (direction: 'left' | 'right') => {
    const action = direction === 'right' ? 'like' : 'nope';
    if (currentUser) {
      swipeUser(currentUser.id, action);
      setHistory(prev => [currentUser.id, ...prev].slice(0, 50));
    }
    position.setValue({ x: 0, y: 0 });
    setCurrentIndex(prev => prev + 1);
    setIsAnimating(false);
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const showUpgradePrompt = (feature: string) => {
    Alert.alert(
      'Upgrade Required',
      feature === 'right swipes'
        ? "You're out of likes for today!"
        : `You've reached your limit for ${feature}. Upgrade to ${tier === 'free' ? 'Gold' : 'VIP'} for more!`,
      [
        { text: 'OK', style: 'cancel' },
        { text: 'Upgrade to Gold for Unlimited Likes', onPress: () => router.push('/premium' as any) },
      ]
    );
  };

  const handleActionButton = async (action: 'nope' | 'like' | 'superlike') => {
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
        swipeUser(currentUser.id, 'superlike');
        position.setValue({ x: 0, y: 0 });
        setCurrentIndex(prev => prev + 1);
        setIsAnimating(false);
      });
    }
  };

  const onRewind = () => {
    if (!features.rewind) {
      showUpgradePrompt('rewind');
      return;
    }
    const lastId = history[0];
    if (!lastId) return;
    const prevIndex = Math.max(0, currentIndex - 1);
    setCurrentIndex(prevIndex);
    setHistory(prev => prev.slice(1));
  };


  const viewsLeftText = useMemo(() => {
    if (features.profileViews === 'unlimited') return '∞';
    if (typeof remainingProfileViews === 'number') return String(remainingProfileViews);
    return '∞';
  }, [features.profileViews, remainingProfileViews]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title} testID="discover-title">{t('Discover')}</Text>
          <View style={styles.locationRow}>
            <MapPin size={16} color={colors.text.secondary} testID="icon-location" />
            <Text style={styles.subtitle} numberOfLines={1} testID="discover-location">{filters.locationLabel}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={[styles.beSeenButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/boost' as any)}
            testID="be-seen"
          >
            <Rocket size={16} color={colors.text.white} testID="icon-boost" />
            <Text style={[styles.beSeenText, { color: colors.text.white }]}>{t('Boost')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => router.push('/discovery-filters' as any)}
            testID="open-filters"
          >
            <Filter size={20} color={colors.primary} testID="icon-filter" />
          </TouchableOpacity>
        </View>
      </View>

      {tier === 'free' && (
        <TouchableOpacity 
          style={[styles.limitsBanner, { backgroundColor: colors.gradient.start }]}
          onPress={() => router.push('/premium' as any)}
          testID="limits-banner"
        >
          <Text style={[styles.limitsText, { color: colors.text.white }]}>
            {t('Free plan')}: {t('swipes left today')} {typeof remainingRightSwipes === 'number' ? remainingRightSwipes : '∞'} • {t('views')} {viewsLeftText}
          </Text>
          <Text style={[styles.upgradePrompt, { color: colors.text.white }]}>{t('Tap to upgrade')}</Text>
        </TouchableOpacity>
      )}

      {!currentUser ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('No more profiles!')}</Text>
          <Text style={styles.emptySubtext}>{t('Check back later for more matches')}</Text>
          <TouchableOpacity style={[styles.beSeenButton, { marginTop: 12 }]} onPress={() => router.push('/premium' as any)} testID="empty-upgrade">
            <Rocket size={16} color={colors.text.white} />
            <Text style={styles.beSeenText}>{t('Boost visibility')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.cardsContainer} testID="cards-container" accessibilityLabel="Cards">
            {nextUser && (
              <Animated.View
                style={[
                  styles.cardWrapper,
                  { transform: [{ scale: nextCardScale }] },
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
                <Text style={[styles.likeLabelText, { borderColor: colors.like, color: colors.like }]}>LIKE</Text>
              </Animated.View>

              <Animated.View style={[styles.nopeLabel, { opacity: nopeOpacity }]}>
                <Text style={[styles.nopeLabelText, { borderColor: colors.nope, color: colors.nope }]}>NOPE</Text>
              </Animated.View>
            </Animated.View>
          </View>

          <View style={styles.actions}>
            {features.rewind && (
              <TouchableOpacity
                style={[styles.actionButton, styles.nopeButton]}
                onPress={onRewind}
                testID="rewind-btn"
              >
                <Undo2 size={26} color={colors.nope} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, { borderWidth: 2, borderColor: colors.nope, backgroundColor: colors.background }]}
              onPress={() => handleActionButton('nope')}
            >
              <X size={30} color={colors.nope} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { borderWidth: 2, borderColor: colors.superLike, backgroundColor: colors.background }]}
              onPress={() => handleActionButton('superlike')}
            >
              <Star size={26} color={colors.superLike} fill={colors.superLike} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { borderWidth: 2, borderColor: colors.like, backgroundColor: colors.background }]}
              onPress={() => handleActionButton('like')}
            >
              <Heart size={30} color={colors.like} fill={colors.like} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {tier === 'free' && (
        <View style={[styles.adBanner, { borderColor: colors.border, backgroundColor: '#E9ECF2' }]} testID="ad-banner-bottom">
          <Text style={[styles.adText, { color: colors.text.secondary }]}>Ad Placeholder</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ColorsConst.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: ColorsConst.background,
    zIndex: 10,
    elevation: 10,
    borderBottomWidth: 1,
    borderBottomColor: ColorsConst.border,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ColorsConst.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: ColorsConst.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  titleWrap: { flexDirection: 'column', flex: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  subtitle: { fontSize: 13, color: ColorsConst.text.secondary, maxWidth: 200 },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 11,
  },
  beSeenButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  beSeenText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  limitsBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    position: 'relative',
    zIndex: 3,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  limitsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  upgradePrompt: {
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: ColorsConst.text.primary,
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
    left: 40,
    zIndex: 1000,
    transform: [{ rotate: '-30deg' }],
  },
  likeLabelText: {
    borderWidth: 5,
    fontSize: 36,
    fontWeight: '900',
    padding: 12,
    borderRadius: 8,
  },
  nopeLabel: {
    position: 'absolute',
    top: 50,
    right: 40,
    zIndex: 1000,
    transform: [{ rotate: '30deg' }],
  },
  nopeLabelText: {
    borderWidth: 5,
    fontSize: 36,
    fontWeight: '900',
    padding: 12,
    borderRadius: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 12,
    gap: 20,
    backgroundColor: ColorsConst.background,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  nopeButton: {
    borderWidth: 2,
    borderColor: ColorsConst.nope,
  },
  superLikeButton: {
    borderWidth: 2,
    borderColor: ColorsConst.superLike,
  },
  likeButton: {
    borderWidth: 2,
    borderColor: ColorsConst.like,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ColorsConst.text.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: ColorsConst.text.secondary,
    textAlign: 'center',
  },
  adBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  adText: { fontWeight: '600' },
});