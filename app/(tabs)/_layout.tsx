import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { User, Heart, MessageCircle } from 'lucide-react-native';
import { Platform, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useI18n } from '@/hooks/i18n-context';
import { useAuth } from '@/hooks/auth-context';
import { BlurView } from 'expo-blur';

// Custom overlapping cards icon to match design
const OverlappingCardsIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <View style={styles.cardsContainer}>
    <View style={[styles.card, styles.cardBack, { borderColor: color, width: size * 0.7, height: size * 0.7 }]} />
    <View style={[styles.card, styles.cardFront, { borderColor: color, width: size * 0.7, height: size * 0.7 }]} />
  </View>
);

const styles = StyleSheet.create({
  cardsContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  cardBack: {
    top: 2,
    left: 2,
    opacity: 0.6,
  },
  cardFront: {
    top: 0,
    left: 0,
  },
});

export default function TabLayout() {
  const { t, lang } = useI18n() as { t: (k: string) => string; lang: 'en' | 'am' };
  const { isAuthenticated, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/onboarding' as any);
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <Tabs
      key={lang}
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.text.light,
        headerShown: false,
        tabBarLabelStyle: {
          fontWeight: '700' as const,
          fontSize: 11,
          marginTop: 4,
          marginBottom: Platform.OS === 'ios' ? -4 : 0,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom + 20, Platform.OS === 'ios' ? 34 : 28),
          height: Platform.OS === 'ios' ? 100 + insets.bottom : 85 + insets.bottom,
          backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.72)' : Colors.card,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -3 },
          elevation: 10,
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={100}
              tint="light"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                overflow: 'hidden',
              }}
            />
          ) : null
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('Discover'),
          tabBarIcon: ({ color }) => <OverlappingCardsIcon color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          title: t('Likes'),
          tabBarIcon: ({ color }) => <Heart size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('Messages'),
          tabBarIcon: ({ color }) => <MessageCircle size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('Profile'),
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile-details"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}