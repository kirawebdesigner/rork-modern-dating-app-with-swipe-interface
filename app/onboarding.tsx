import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import GradientButton from '@/components/GradientButton';

const { width: screenWidth } = Dimensions.get('window');

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

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / screenWidth);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentIndex + 1) * screenWidth,
        animated: true,
      });
    } else {
      router.push('/(auth)' as any);
    }
  };

  const handleSkip = () => {
    router.push('/(auth)' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={styles.slide}>
            <View style={styles.imageContainer}>
              <Image source={{ uri: slide.image }} style={styles.image} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.description}>{slide.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

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
          <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)}>
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
    top: 60,
    right: 20,
    zIndex: 1,
  },
  skipText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  slide: {
    width: screenWidth,
    flex: 1,
    paddingHorizontal: 20,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  image: {
    width: screenWidth - 80,
    height: (screenWidth - 80) * 1.3,
    borderRadius: 20,
  },
  textContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 16,
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
    paddingBottom: 40,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 30,
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