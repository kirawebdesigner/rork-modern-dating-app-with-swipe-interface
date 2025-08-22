import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import Colors from '@/constants/colors';
import GradientButton from '@/components/GradientButton';

export default function NotificationsPermission() {
  const router = useRouter();
  const [granted, setGranted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const request = async () => {
    try {
      setLoading(true);
      if (Platform.OS === 'web') {
        setGranted(true);
      } else {
        const settings = await Notifications.requestPermissionsAsync();
        const isGranted = settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
        setGranted(!!isGranted);
      }
    } catch (e) {
      console.log('[NotificationsPermission] error', e);
      setGranted(false);
    } finally {
      setLoading(false);
    }
  };

  const next = () => router.replace('/(tabs)' as any);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Enable notifications</Text>
        <Text style={styles.subtitle}>Get notified when you get matches and messages.</Text>

        <GradientButton title={granted ? 'Notifications enabled' : 'Enable notifications'} onPress={request} loading={loading} style={styles.button} />
        <TouchableOpacity onPress={next}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text.primary, marginBottom: 12 },
  subtitle: { fontSize: 16, color: Colors.text.secondary, marginBottom: 24 },
  button: { marginBottom: 16 },
  skip: { color: Colors.primary, textAlign: 'center', fontWeight: '600' },
});