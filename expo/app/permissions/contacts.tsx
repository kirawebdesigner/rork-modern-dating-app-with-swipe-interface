import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import GradientButton from '@/components/GradientButton';

export default function ContactsPermission() {
  const router = useRouter();
  const [granted, setGranted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const request = async () => {
    try {
      setLoading(true);
      setGranted(true);
    } catch (e) {
      console.log('[ContactsPermission] error', e);
      setGranted(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (granted) {
      router.replace('/permissions/notifications' as any);
    }
  }, [granted]);

  const next = () => router.replace('/permissions/notifications' as any);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Find friends from contacts</Text>
        <Text style={styles.subtitle}>Allow access to your contacts to discover friends already on the app.</Text>

        <GradientButton title={granted ? 'Granted 680' : 'Allow contacts access'} onPress={request} loading={loading} style={styles.button} />
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