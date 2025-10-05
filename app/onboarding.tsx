import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ListRenderItemInfo,
  Dimensions,
  useWindowDimensions,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import GradientButton from '@/components/GradientButton';
import { Platform } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

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
  const itemLayout = useMemo(() => ({ length: width, offset: 0, index: 0 }), [width]);
  const listRef = useRef<FlatList<Slide>>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    const idx = viewableItems?.[0]?.index ?? 0;
    console.log('[Onboarding] viewable index', idx);
    setCurrentIndex(idx ?? 0);
  }).current;

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 60 });

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

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip} testID="skip-button">
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={slides as Slide[]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: ListRenderItemInfo<Slide>) => (
          <View style={[styles.slide, { width }]} testID={`slide-${item.id}`}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: item.image }}
                style={[styles.image, { width: width - 80 }]}
                accessibilityIgnoresInvertColors
                accessible
                accessibilityLabel={item.title}
                testID={`slide-image-${item.id}`}
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          </View>
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
    top: 12,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
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
    paddingTop: 32,
  },
  image: {
    aspectRatio: 4 / 5,
    borderRadius: 20,
    resizeMode: 'cover',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  textContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 12,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    zIndex: 5,
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  activeDot: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  button: {
    width: '100%',
    marginBottom: 20,
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