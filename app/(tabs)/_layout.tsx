import { Redirect, Tabs } from 'expo-router';
import { User, Sparkles, Diamond, MessageCircle } from 'lucide-react-native';
import React from 'react';
import { Platform } from 'react-native';
import Colors from '@/constants/colors';
import { useI18n } from '@/hooks/i18n-context';
import { useAuth } from '@/hooks/auth-context';
import { BlurView } from 'expo-blur';

export default function TabLayout() {
  const { t, lang } = useI18n() as { t: (k: string) => string; lang: 'en' | 'am' };
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href={"/onboarding" as any} />;

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
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          height: Platform.OS === 'ios' ? 88 : 65,
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
          tabBarIcon: ({ color }) => <Sparkles size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          title: t('Likes'),
          tabBarIcon: ({ color }) => <Diamond size={24} color={color} />,
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