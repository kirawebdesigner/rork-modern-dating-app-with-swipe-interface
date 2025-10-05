import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, SafeAreaView, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useMembership } from '@/hooks/membership-context';
import { Match, User } from '@/types';
import { Diamond, Lock } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const GAP = 12;
const NUM_COLUMNS = 2 as const;
const CARD_SIZE = Math.floor((width - 20 * 2 - GAP) / NUM_COLUMNS);

type LikesTab = 'likes' | 'matches';

export default function LikesAndMatchesScreen() {
  const router = useRouter();
  const { features } = useMembership();
  const [active, setActive] = useState<LikesTab>('likes');

  const likesData: User[] = useMemo(() => [], []);
  const matchesData: Match[] = useMemo(() => [], []);
  const canSee = true;

  const onOpenMatchChat = useCallback((chatId: string) => {
    router.push({ pathname: '/(tabs)/messages/[chatId]', params: { chatId } });
  }, [router]);

  const renderLike = ({ item }: { item: User }) => {
    const blurred = !canSee;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(tabs)/profile-details/${item.id}` as any)}
        disabled={blurred}
        testID={`likes-card-${item.id}`}
      >
        <Image
          source={{ uri: item.photos[0] }}
          style={styles.image}
          blurRadius={blurred ? (Platform.OS === 'web' ? 8 : 20) : 0}
        />
        <View style={styles.gradientOverlay} />
        <View style={styles.infoRow}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.age}>{item.age}</Text>
        </View>

      </TouchableOpacity>
    );
  };

  const renderMatch = ({ item }: { item: Match }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onOpenMatchChat(item.id)}
        testID={`match-card-${item.id}`}
      >
        <Image
          source={{ uri: item.user.photos[0] }}
          style={styles.image}
        />
        <View style={styles.gradientOverlay} />
        <View style={styles.infoRow}>
          <Text style={styles.name} numberOfLines={1}>{item.user.name}</Text>
          <Text style={styles.age}>{item.user.age}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <View style={styles.headerCenter}>
          <View style={styles.titleRow}>
            <Diamond size={20} color={Colors.primary} />
            <Text style={styles.title}>Likes & Matches</Text>
          </View>
          <Text style={styles.subtitle}>{likesData.length} likes • {matchesData.length} matches</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.segment}>
        <TouchableOpacity
          onPress={() => setActive('likes')}
          style={[styles.segmentItem, active === 'likes' && styles.segmentItemActive]}
          testID="segment-likes"
        >
          <Text style={[styles.segmentText, active === 'likes' && styles.segmentTextActive]}>Likes You</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActive('matches')}
          style={[styles.segmentItem, active === 'matches' && styles.segmentItemActive]}
          testID="segment-matches"
        >
          <Text style={[styles.segmentText, active === 'matches' && styles.segmentTextActive]}>Matches</Text>
        </TouchableOpacity>
      </View>



      {active === 'likes' ? (
        likesData.length > 0 ? (
          <FlatList
            data={likesData}
            keyExtractor={(u) => u.id}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={styles.row}
            renderItem={renderLike}
            contentContainerStyle={styles.list}
            testID="likes-grid"
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Diamond size={48} color={Colors.text.secondary} />
            <Text style={styles.emptyTitle}>No likes yet</Text>
            <Text style={styles.emptyText}>Keep swiping to find your matches!</Text>
          </View>
        )
      ) : (
        matchesData.length > 0 ? (
          <FlatList
            data={matchesData}
            keyExtractor={(m) => m.id}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={styles.row}
            renderItem={renderMatch}
            contentContainerStyle={styles.list}
            testID="matches-grid"
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Diamond size={48} color={Colors.text.secondary} />
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyText}>Start swiping to find your perfect match!</Text>
          </View>
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { width: 24 },
  headerRight: { width: 24 },
  headerCenter: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text.primary },
  subtitle: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  segment: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentItemActive: {
    backgroundColor: Colors.card,
  },
  segmentText: { color: Colors.text.secondary, fontWeight: '600' },
  segmentTextActive: { color: Colors.text.primary },
  banner: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.gradient.start,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bannerText: { color: Colors.text.white, fontWeight: '700' },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  row: { gap: GAP, marginBottom: GAP },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE * 1.25,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.card,
  },
  image: { width: '100%', height: '100%' },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  infoRow: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  name: { color: Colors.text.white, fontWeight: '700', fontSize: 14, flexShrink: 1 },
  age: { color: Colors.text.white, opacity: 0.9 },
  lockOverlay: {
    ...Platform.select({ default: { position: 'absolute' }, web: { position: 'absolute' } }),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lockText: { color: Colors.text.white, fontWeight: '700' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text.primary, marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.text.secondary, textAlign: 'center' },
});
