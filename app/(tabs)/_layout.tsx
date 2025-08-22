import { Tabs } from 'expo-router';
import { User, Sparkles, Diamond, MessageCircle } from 'lucide-react-native';
import React from 'react';
import Colors from '@/constants/colors';
import { useI18n } from '@/hooks/i18n-context';

export default function TabLayout() {
  const { t, lang } = useI18n() as { t: (k: string) => string; lang: 'en' | 'am' };
  return (
    <Tabs
      key={lang}
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.text.light,
        headerShown: false,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
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