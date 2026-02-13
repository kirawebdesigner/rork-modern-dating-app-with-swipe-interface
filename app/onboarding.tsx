import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ListRenderItemInfo,
  useWindowDimensions,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Heart, Bell, Users, Sparkles, Shield, ChevronRight, ArrowRight } from 'lucide-react-native';

import { useAuth } from '@/hooks/auth-context';

const slides = [
  {
    id: '1',
    title: 'Find Your Match',
    description: 'Discover amazing people near you who share your passions and interests.',
    icon: 'heart',
    color: '#FF2D55',
    bgGradient: ['#FF2D55', '#FF6B8A'] as const,
    emoji: '💕',
  },
  {
    id: '2',
    title: 'Stay Connected',
    description: 'Get instant notifications when someone likes you or sends a message.',
    icon: 'bell',
    color: '#FF9500',
    bgGradient: ['#FF9500', '#FFCC02'] as const,
    emoji: '🔔',
  },
  {
    id: '3',
    title: 'Smart Matching',
    description: 'Our algorithm pairs you with people who truly match your personality.',
    icon: 'sparkles',
    color: '#5856D6',
    bgGradient: ['#5856D6', '#AF52DE'] as const,
    emoji: '✨',
  },
  {
    id: '4',
    title: 'Safe & Verified',
    description: 'Every profile goes through verification to keep our community authentic.',
    icon: 'shield',
    color: '#34C759',
    bgGradient: ['#34C759', '#30D158'] as const,
    emoji: '🛡️',
  },
  {
    id: '5',
    title: 'Ready to Start?',
    description: 'Join thousands of people who found meaningful connections here.',
    icon: 'users',
    color: '#FF2D55',
    bgGradient: ['#FF2D55', '#C2185B'] as const,
    emoji: '🚀',
  },
];

type Slide = (typeof slides)[number];

const IconForSlide = ({ icon, color }: { icon: string; color: string }) => {
  const size = 36;
  switch (icon) {
    case 'heart': return <Heart size={size} color={color} fill={color} />;
    case 'bell': return <Bell size={size} color={color} />;
    case 'sparkles': return <Sparkles size={size} color={color} />;
    case 'shield': return <Shield size={size} color={color} />;
    case 'users': return <Users size={size} color={color} />;
    default: return <Heart size={size} color={color} />;
  }
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const { isAuthenticated, user } = useAuth();

  const scrollX = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const emojiFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(emojiFloat, { toValue: -12, duration: 1500, useNativeDriver: true }),
        Animated.timing(emojiFloat, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [emojiFloat]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
    const idx = viewableItems?.[0]?.index ?? 0;
    setCurrentIndex(idx ?? 0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }).current;

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 60 });

  useEffect(() => {
    let mounted = true;
    const redirectIfReady = async () => {
      try {
        if (!mounted || !isAuthenticated) return;
        const completed = Boolean(user?.profile?.completed);
        console.log('[Onboarding] Redirect check:', { isAuthenticated, completed });
        if (completed) {
          router.replace('/(tabs)' as any);
          return;
        }
        if (isAuthenticated && !completed) {
          router.replace('/profile-setup' as any);
          return;
        }
      } catch (e) {
        console.log('[Onboarding] redirect check failed', e);
      }
    };
    redirectIfReady();
    const t = setTimeout(redirectIfReady, 400);
    return () => { mounted = false; clearTimeout(t); };
  }, [isAuthenticated, user, router]);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleNext = useCallback(() => {
    triggerHaptic();

    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(buttonScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    if (currentIndex < slides.length - 1) {
      try {
        listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      } catch (e) {
        console.log('[Onboarding] scrollToIndex failed', e);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/(auth)/signup' as any);
    }
  }, [currentIndex, triggerHaptic, buttonScale, router]);

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(auth)/signup' as any);
  }, [router]);

  const handleLogin = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(auth)/login' as any);
  }, [router]);

  const isLast = currentIndex === slides.length - 1;
  const currentSlide = slides[currentIndex];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={currentSlide?.bgGradient ?? ['#FF2D55', '#FF6B8A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />
      <View style={styles.decorCircle3} />

      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>{currentIndex + 1}/{slides.length}</Text>
          </View>
          {!isLast && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton} testID="skip-button">
              <Text style={styles.skipText}>Skip</Text>
              <ChevronRight size={16} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          ref={listRef}
          data={slides}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }: ListRenderItemInfo<Slide>) => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.8, 1, 0.8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.4, 1, 0.4],
              extrapolate: 'clamp',
            });
            const translateY = scrollX.interpolate({
              inputRange,
              outputRange: [30, 0, 30],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                style={[
                  styles.slide,
                  { width },
                  { opacity, transform: [{ scale }, { translateY }] },
                ]}
                testID={`slide-${item.id}`}
              >
                <View style={styles.iconContainer}>
                  <View style={styles.iconCircle}>
                    <IconForSlide icon={item.icon} color={item.color} />
                  </View>
                  <Animated.Text
                    style={[styles.emojiFloat, { transform: [{ translateY: emojiFloat }] }]}
                  >
                    {item.emoji}
                  </Animated.Text>
                </View>

                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </Animated.View>
            );
          }}
          horizontal
          pagingEnabled
          style={styles.list}
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewConfigRef.current}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          initialNumToRender={1}
          windowSize={3}
          removeClippedSubviews={Platform.OS !== 'web'}
        />

        <View style={styles.footer}>
          <View style={styles.pagination}>
            {slides.map((s, index) => {
              const dotWidth = scrollX.interpolate({
                inputRange: [(index - 1) * width, index * width, (index + 1) * width],
                outputRange: [8, 28, 8],
                extrapolate: 'clamp',
              });
              const dotOpacity = scrollX.interpolate({
                inputRange: [(index - 1) * width, index * width, (index + 1) * width],
                outputRange: [0.4, 1, 0.4],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  key={s.id}
                  style={[
                    styles.dot,
                    { width: dotWidth, opacity: dotOpacity },
                  ]}
                />
              );
            })}
          </View>

          <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleNext}
              activeOpacity={0.85}
              testID="cta-button"
            >
              <Text style={styles.ctaText}>
                {isLast ? "Let's Go!" : 'Continue'}
              </Text>
              <ArrowRight size={20} color={currentSlide?.color ?? '#FF2D55'} />
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity onPress={handleLogin} style={styles.loginButton} testID="signin-link">
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginLink}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  decorCircle1: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: 120,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decorCircle3: {
    position: 'absolute',
    top: '40%',
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 16 : 8,
    paddingBottom: 8,
  },
  stepIndicator: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  stepText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  list: {
    flex: 1,
  },
  slide: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  emojiFloat: {
    fontSize: 40,
    position: 'absolute',
    top: -30,
    right: -20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  description: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 300,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'web' ? 24 : 16,
    alignItems: 'center',
    gap: 16,
  },
  pagination: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#1A1A1A',
    letterSpacing: 0.3,
  },
  loginButton: {
    paddingVertical: 4,
  },
  loginText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  loginLink: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
    textDecorationLine: 'underline',
  },
});
