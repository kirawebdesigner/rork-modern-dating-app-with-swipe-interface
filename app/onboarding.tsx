import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ListRenderItemInfo,
  useWindowDimensions,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import GradientButton from '@/components/GradientButton';
import { useAuth } from '@/hooks/auth-context';



const slides = [
  {
    id: '1',
    title: 'Search friends',
    description: 'Find friends from your contacts and get connected.',
    image: 'https://img.icons8.com/fluency/240/find-user-male.png',
  },
  {
    id: '2',
    title: 'Enable notifications',
    description: 'Get notified when you get a match or receive a message.',
    image: 'https://img.icons8.com/fluency/240/appointment-reminders--v2.png',
  },
  {
    id: '3',
    title: 'Matches',
    description: 'We match you with people that have a large array of similar interests.',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
  },
  {
    id: '4',
    title: 'Premium',
    description: 'Sign up today and enjoy the first month of premium benefits on us.',
    image: 'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?w=800',
  },
  {
    id: '5',
    title: 'Algorithm',
    description: 'Users go through a vetting process to help prevent matching with bots.',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
  },
];

type Slide = { id: string; title: string; description: string; image: string };

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const { isAuthenticated } = useAuth();
  const { user } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
    const idx = viewableItems?.[0]?.index ?? 0;
    console.log('[Onboarding] viewable index', idx);
    setCurrentIndex(idx ?? 0);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
    });
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
          console.log('[Onboarding] Profile completed, redirecting to tabs');
          router.replace('/(tabs)' as any);
          return;
        }
        
        if (isAuthenticated && !completed) {
          console.log('[Onboarding] Profile incomplete, redirecting to profile-setup');
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

  const handleNext = () => {
    console.log('[Onboarding] CTA pressed at index', currentIndex);
    if (currentIndex < slides.length - 1) {
      try {
        listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      } catch (e) {
        console.log('[Onboarding] scrollToIndex failed', e);
      }
    } else {
      console.log('[Onboarding] Navigating to signup');
      try {
        router.push('/(auth)/signup' as any);
      } catch (e) {
        console.log('[Onboarding] Navigation failed', e);
      }
    }
  };

  const handleSkip = () => {
    console.log('[Onboarding] Skip pressed');
    try {
      router.push('/(auth)/signup' as any);
    } catch (e) {
      console.log('[Onboarding] Skip navigation failed', e);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip} testID="skip-button">
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={slides as Slide[]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: ListRenderItemInfo<Slide>) => (
          <Animated.View 
            style={[
              styles.slide, 
              { width },
              { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
            ]} 
            testID={`slide-${item.id}`}
          >
            <View style={styles.imageContainer}>
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: item.image }}
                  style={[styles.image, { width: width - 80 }]}
                  accessibilityIgnoresInvertColors
                  accessible
                  accessibilityLabel={item.title}
                  testID={`slide-image-${item.id}`}
                />
                <View style={styles.imageOverlay} />
              </View>
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          </Animated.View>
        )}
        horizontal
        pagingEnabled
        style={styles.list}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfigRef.current}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        initialNumToRender={1}
        windowSize={3}
        removeClippedSubviews={Platform.OS !== 'web'}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.footer} pointerEvents="box-none">
        <View style={styles.pagination}>
          {slides.map((s, index) => (
            <View
              key={s.id}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>

        <GradientButton
          title={currentIndex === slides.length - 1 ? 'Get Started' : 'Create an account'}
          onPress={handleNext}
          style={styles.button}
          testID="cta-button"
        />

        {currentIndex < slides.length - 1 && (
          <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)} testID="signin-link">
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginLink}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  skipButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: Colors.card,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  skipText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  listContent: {
    alignItems: 'stretch',
    paddingBottom: 140,
  },
  slide: {
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 48,
  },
  imageWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'transparent',
  },
  image: {
    aspectRatio: 4 / 5,
    resizeMode: 'cover',
  },
  textContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    alignItems: 'center',
    backgroundColor: Colors.background,
    zIndex: 5,
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  pagination: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  activeDot: {
    width: 32,
    backgroundColor: Colors.primary,
  },
  button: {
    width: '100%',
    marginBottom: 16,
  },
  loginText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  loginLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
});