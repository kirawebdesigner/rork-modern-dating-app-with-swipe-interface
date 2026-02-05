import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

import { User } from '@/types';
import { ArrowUpDown, X, Heart } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/hooks/app-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const PADDING = 20;
const GAP = 12;
const NUM_COLUMNS = 2 as const;
const CARD_WIDTH = Math.floor((width - PADDING * 2 - GAP) / NUM_COLUMNS);
const CARD_HEIGHT = CARD_WIDTH * 1.4;

interface MatchItem extends User {
  matchId?: string;
  likedAt?: Date;
}

export default function MatchesScreen() {
  const router = useRouter();
  const { matches: contextMatches } = useApp();
  const [likesData, setLikesData] = useState<MatchItem[]>([]);
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
        .select('swiper_id, created_at')
        .eq('swiped_id', myId)
        .in('action', ['like', 'superlike'])
        .order('created_at', { ascending: false });

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

      const swipeMap = new Map(swipes.map((s: any) => [s.swiper_id, new Date(s.created_at)]));
      
      const mapped: MatchItem[] = (profiles as any[]).map((p) => ({
        id: String(p.id),
        name: String(p.name ?? 'User'),
        age: Number(p.age ?? 0),
        gender: (p.gender as 'boy' | 'girl') ?? 'boy',
        bio: String(p.bio ?? ''),
        photos: Array.isArray(p.photos) && p.photos.length > 0 ? (p.photos as string[]) : ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=640&auto=format&fit=crop'],
        interests: Array.isArray(p.interests) ? (p.interests as string[]) : [],
        location: { city: String(p.city ?? '') },
        likedAt: swipeMap.get(p.id),
      } as MatchItem));

      mapped.sort((a, b) => {
        const dateA = a.likedAt?.getTime() ?? 0;
        const dateB = b.likedAt?.getTime() ?? 0;
        return dateB - dateA;
      });

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

  const isToday = (date?: Date) => {
    if (!date) return true;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isYesterday = (date?: Date) => {
    if (!date) return false;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
  };

  const allItems: MatchItem[] = [
    ...likesData, 
    ...contextMatches.map(m => ({ ...m.user, matchId: m.id } as MatchItem))
  ];

  const todayItems = allItems.filter(item => isToday(item.likedAt));
  const yesterdayItems = allItems.filter(item => isYesterday(item.likedAt));
  const olderItems = allItems.filter(item => !isToday(item.likedAt) && !isYesterday(item.likedAt));

  const renderDateSeparator = (title: string) => (
    <View style={styles.dateSeparator}>
      <View style={styles.dateLine} />
      <Text style={styles.dateText}>{title}</Text>
      <View style={styles.dateLine} />
    </View>
  );

  const renderCard = (item: MatchItem) => {
    const isMatch = 'matchId' in item && item.matchId;
    
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.card}
        onPress={() => isMatch ? onOpenMatchChat(item.matchId!) : onViewProfile(item.id)}
        activeOpacity={0.9}
        testID={`match-card-${item.id}`}
      >
        <Image
          source={{ uri: item.photos?.[0] || 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=640&auto=format&fit=crop' }}
          style={styles.cardImage}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={styles.cardGradient}
        />
        
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.name}, {item.age}</Text>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => {}}>
            <X size={18} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity style={styles.actionBtn} onPress={() => isMatch ? onOpenMatchChat(item.matchId!) : onViewProfile(item.id)}>
            <Heart size={18} color="#FFFFFF" fill="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {!isMatch && (
          <View style={styles.likeBadge}>
            <Heart size={12} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderGrid = (items: MatchItem[]) => {
    const rows: MatchItem[][] = [];
    for (let i = 0; i < items.length; i += 2) {
      rows.push(items.slice(i, i + 2));
    }
    
    return rows.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.row}>
        {row.map(item => renderCard(item))}
        {row.length === 1 && <View style={styles.cardPlaceholder} />}
      </View>
    ));
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    if (allItems.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Heart size={32} color="#FF4D67" />
          </View>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptyText}>Start swiping to find your perfect match!</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={[1]}
        keyExtractor={() => 'content'}
        renderItem={() => (
          <View style={styles.contentWrapper}>
            {todayItems.length > 0 && (
              <>
                {renderDateSeparator('Today')}
                {renderGrid(todayItems)}
              </>
            )}
            
            {yesterdayItems.length > 0 && (
              <>
                {renderDateSeparator('Yesterday')}
                {renderGrid(yesterdayItems)}
              </>
            )}
            
            {olderItems.length > 0 && (
              <>
                {renderDateSeparator('Earlier')}
                {renderGrid(olderItems)}
              </>
            )}
          </View>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Matches</Text>
          <Text style={styles.subtitle}>
            This is a list of people who have liked you{'\n'}and your matches.
          </Text>
        </View>
        <TouchableOpacity style={styles.sortBtn}>
          <ArrowUpDown size={20} color="#FF4D67" />
        </TouchableOpacity>
      </View>

      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: PADDING,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
    marginRight: 12,
  },
  title: { 
    fontSize: 32, 
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
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  contentWrapper: {
    paddingHorizontal: PADDING,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 4,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E8E8',
  },
  dateText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    marginHorizontal: 16,
  },
  list: { 
    paddingBottom: 24,
  },
  row: { 
    flexDirection: 'row',
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
  cardPlaceholder: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
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
    height: '55%',
  },
  cardInfo: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 54,
  },
  cardName: { 
    color: '#FFFFFF', 
    fontWeight: '600', 
    fontSize: 15,
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
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: 12,
  },
  likeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
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
