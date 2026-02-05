import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

import { User } from '@/types';
import { ArrowUpDown, X, Heart } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/hooks/app-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const GAP = 12;
const NUM_COLUMNS = 2 as const;
const CARD_WIDTH = Math.floor((width - 20 * 2 - GAP) / NUM_COLUMNS);
const CARD_HEIGHT = CARD_WIDTH * 1.35;

export default function MatchesScreen() {
  const router = useRouter();
  const { matches: contextMatches } = useApp();
  const [likesData, setLikesData] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadLikes();
  }, []);

  const loadLikes = async () => {
    try {
      setLoading(true);
      const { data: authUser } = await supabase.auth.getUser();
      const myId = authUser?.user?.id ?? null;
      if (!myId) {
        console.log('[Likes] no user ID');
        setLikesData([]);
        return;
      }

      const { data: swipes, error } = await supabase
        .from('swipes')
        .select('swiper_id')
        .eq('swiped_id', myId)
        .in('action', ['like', 'superlike']);

      if (error) {
        console.log('[Likes] error loading swipes:', error.message);
        setLikesData([]);
        return;
      }

      if (!swipes || swipes.length === 0) {
        console.log('[Likes] no likes found');
        setLikesData([]);
        return;
      }

      const likerIds = swipes.map((s: any) => s.swiper_id);
      console.log('[Likes] found', likerIds.length, 'likes');

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id,name,age,gender,bio,photos,interests,city')
        .in('id', likerIds);

      if (profilesError) {
        console.log('[Likes] error loading profiles:', profilesError.message);
        setLikesData([]);
        return;
      }

      const mapped: User[] = (profiles as any[]).map((p) => ({
        id: String(p.id),
        name: String(p.name ?? 'User'),
        age: Number(p.age ?? 0),
        gender: (p.gender as 'boy' | 'girl') ?? 'boy',
        bio: String(p.bio ?? ''),
        photos: Array.isArray(p.photos) && p.photos.length > 0 ? (p.photos as string[]) : ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=640&auto=format&fit=crop'],
        interests: Array.isArray(p.interests) ? (p.interests as string[]) : [],
        location: { city: String(p.city ?? '') },
      } as User));

      console.log('[Likes] loaded', mapped.length, 'profiles');
      setLikesData(mapped);
    } catch (e) {
      console.log('[Likes] load error:', e);
      setLikesData([]);
    } finally {
      setLoading(false);
    }
  };

  const onOpenMatchChat = useCallback((chatId: string) => {
    router.push({ pathname: '/(tabs)/messages/[chatId]' as any, params: { chatId } });
  }, [router]);

  const onViewProfile = useCallback((userId: string) => {
    router.push(`/(tabs)/profile-details/${userId}` as any);
  }, [router]);

  const allItems = [...likesData, ...contextMatches.map(m => ({ ...m.user, matchId: m.id }))];

  const renderDateSeparator = (title: string) => (
    <View style={styles.dateSeparator}>
      <View style={styles.dateLine} />
      <Text style={styles.dateText}>{title}</Text>
      <View style={styles.dateLine} />
    </View>
  );

  const renderCard = ({ item, index }: { item: any; index: number }) => {
    const isMatch = 'matchId' in item;
    const showTodayHeader = index === 0;
    const showYesterdayHeader = index === Math.min(4, Math.floor(allItems.length / 2));
    
    return (
      <View>
        {showTodayHeader && index % 2 === 0 && (
          <View style={styles.fullWidthHeader}>
            {renderDateSeparator('Today')}
          </View>
        )}
        {showYesterdayHeader && index % 2 === 0 && allItems.length > 4 && (
          <View style={styles.fullWidthHeader}>
            {renderDateSeparator('Yesterday')}
          </View>
        )}
        <TouchableOpacity
          style={styles.card}
          onPress={() => isMatch ? onOpenMatchChat(item.matchId) : onViewProfile(item.id)}
          activeOpacity={0.9}
          testID={`match-card-${item.id}`}
        >
          <Image
            source={{ uri: item.photos?.[0] || 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=640&auto=format&fit=crop' }}
            style={styles.cardImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.cardGradient}
          />
          
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.name}, {item.age}</Text>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => {}}>
              <X size={20} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity style={styles.actionBtn} onPress={() => isMatch ? onOpenMatchChat(item.matchId) : onViewProfile(item.id)}>
              <Heart size={20} color="#FFFFFF" fill="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {!isMatch && (
            <View style={styles.likeBadge}>
              <Heart size={14} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    return renderCard({ item, index });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Matches</Text>
          <Text style={styles.subtitle}>
            This is a list of people who have liked you{'\n'}and your matches.
          </Text>
        </View>
        <TouchableOpacity style={styles.sortBtn}>
          <ArrowUpDown size={20} color="#FF4D67" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : allItems.length > 0 ? (
        <FlatList
          data={allItems}
          keyExtractor={(item, index) => item.id + '-' + index}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.row}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<View style={styles.listHeader}>{renderDateSeparator('Today')}</View>}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Heart size={32} color="#FF4D67" />
          </View>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptyText}>Start swiping to find your perfect match!</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: { 
    fontSize: 34, 
    fontWeight: '800', 
    color: '#1A1A1A',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: { 
    fontSize: 14, 
    color: '#6B7280',
    lineHeight: 20,
  },
  sortBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  listHeader: {
    marginBottom: 8,
  },
  fullWidthHeader: {
    width: width - 40,
    marginBottom: 12,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  dateText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    marginHorizontal: 16,
  },
  list: { 
    paddingHorizontal: 20, 
    paddingBottom: 24,
  },
  row: { 
    gap: GAP, 
    marginBottom: GAP,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  cardImage: { 
    width: '100%', 
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  cardInfo: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 52,
  },
  cardName: { 
    color: '#FFFFFF', 
    fontWeight: '700', 
    fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 44,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 10,
  },
  likeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF4D67',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF4D67',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFE5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#1A1A1A', 
    marginBottom: 8,
  },
  emptyText: { 
    fontSize: 14, 
    color: '#6B7280', 
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingText: {
    fontSize: 15,
    color: '#6B7280',
  },
});
