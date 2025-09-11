import { Redirect, Tabs } from 'expo-router';
import { User, Sparkles, Diamond, MessageCircle } from 'lucide-react-native';
import React from 'react';
import Colors from '@/constants/colors';
import { useI18n } from '@/hooks/i18n-context';
import { useAuth } from '@/hooks/auth-context';
import { useApp } from '@/hooks/app-context';

export default function TabLayout() {
  const { t, lang } = useI18n() as { t: (k: string) => string; lang: 'en' | 'am' };
  const { isAuthenticated, isLoading } = useAuth();
  const { currentProfile } = useApp();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/onboarding" />;
  if (!(currentProfile?.profileComplete ?? false)) return <Redirect href="/profile-setup" />;

  return (
    <Tabs
      key={lang}
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.text.light,
        headerShown: false,
        tabBarLabelStyle: { fontWeight: '700' as const, fontSize: 12 },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          paddingTop: 6,
          paddingBottom: 10,
          height: 62,
          backgroundColor: Colors.card,
          shadowColor: Colors.shadow,
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 8,
        },
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
    </Tabs>
  );
}