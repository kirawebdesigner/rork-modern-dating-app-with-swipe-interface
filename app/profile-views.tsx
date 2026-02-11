import React, { useMemo } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import Colors from '@/constants/colors';
import { useRouter } from 'expo-router';
import { safeGoBack } from '@/lib/navigation';
import { ArrowLeft } from 'lucide-react-native';
import { mockUsers } from '@/mocks/users';

export default function ProfileViewsScreen() {
  const router = useRouter();
  const data = useMemo(() => mockUsers.slice(0, 20), []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack(router, '/(tabs)/profile')} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Profile Views</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={data}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Image source={{ uri: item.photos[0] }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}, {item.age}</Text>
              <Text style={styles.meta}>Viewed your profile recently</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text.primary },
  list: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.card },
  name: { color: Colors.text.primary, fontWeight: '700' },
  meta: { color: Colors.text.secondary, fontSize: 12 },
});