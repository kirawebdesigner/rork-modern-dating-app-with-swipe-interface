import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ListRenderItemInfo,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import GradientButton from '@/components/GradientButton';
import { Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: "Search friend's",
    description: 'You can find friends from your contact lists to connected',
    image: 'https://r2-pub.rork.com/attachments/48prg5ifrlilhe4fkttv9',
  },
  {
    id: '2',
    title: "Enable notification's",
    description: 'Get push-notification when you get the match or receive a message.',
    image: 'https://r2-pub.rork.com/attachments/5cgj7bmljeznja9ffy0mr',
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
    description: 'Users going through a vetting process to ensure you never match with bots.',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
  },
];

type Slide = { id: string; title: string; description: string; image: string };

export default function OnboardingScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<Slide>>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    const idx = viewableItems?.[0]?.index ?? 0;
    console.log('[Onboarding] viewable index', idx);
    setCurrentIndex(idx ?? 0);
  }).current;

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 60 });

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      router.push('/(auth)/signup' as any);
    }
  };

  const handleSkip = () => {
    router.push('/(auth)/signup' as any);
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
          <View style={styles.slide} testID={`slide-${item.id}`}>
            <View style={styles.imageContainer}>
              <Image source={{ uri: item.image }} style={styles.image} accessibilityIgnoresInvertColors />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          </View>
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfigRef.current}
        getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
        initialNumToRender={1}
        windowSize={3}
        removeClippedSubviews={Platform.OS !== 'web'}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
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
  listContent: {
    alignItems: 'stretch',
  },
  slide: {
    width: screenWidth,
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 32,
  },
  image: {
    width: screenWidth - 80,
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