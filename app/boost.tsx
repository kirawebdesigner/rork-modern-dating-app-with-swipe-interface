import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import Colors from '@/constants/colors';
import { Rocket, Info } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function BoostScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Rocket size={32} color={Colors.primary} />
        <Text style={styles.title}>Boost</Text>
        <Text style={styles.subtitle}>Jump to the top of the stack and be seen by more people near you.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Info size={16} color={Colors.text.secondary} />
          <Text style={styles.tip}>Boosts are part of memberships. Start a boost from here after upgrading.</Text>
        </View>
        <TouchableOpacity style={styles.cta} onPress={() => router.push('/premium' as any)} testID="boost-upgrade">
          <Text style={styles.ctaText}>Upgrade to unlock Boosts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondary]} onPress={() => router.push('/payment-verification' as any)} testID="boost-manual">
          <Text style={styles.secondaryText}>Manual payment verification (Telebirr)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20 },
  header: { alignItems: 'center', gap: 8, marginTop: 10 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text.primary },
  subtitle: { color: Colors.text.secondary, textAlign: 'center' },
  card: { marginTop: 24, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 16, gap: 12 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  tip: { color: Colors.text.secondary, flex: 1 },
  cta: { backgroundColor: Colors.primary, borderRadius: 10, padding: 14, alignItems: 'center' },
  ctaText: { color: Colors.text.white, fontWeight: '700' },
  secondary: { borderColor: Colors.border, borderWidth: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  secondaryText: { color: Colors.text.primary, fontWeight: '700' },
});
