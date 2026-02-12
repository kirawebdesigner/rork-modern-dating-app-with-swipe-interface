import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User } from '@/types';
import { ArrowUpDown, X, Heart, Sparkles } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/hooks/app-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useMembership } from '@/hooks/membership-context';

const { width } = Dimensions.get('window');
const PADDING = 16;
const GAP = 10;
const CARD_WIDTH = Math.floor((width - PADDING * 2 - GAP) / 2);
const CARD_HEIGHT = CARD_WIDTH * 1.4;

interface MatchItem extends User {
  matchId?: string;
  likedAt?: Date;
}

export default function MatchesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { matches: contextMatches } = useApp();
  const { tier } = useMembership();
  const [likesData, setLikesData] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortNewest, setSortNewest] = useState<boolean>(true);

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

  const formatTimeAgo = useCallback((date?: Date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }, []);

  const allItems: MatchItem[] = [
    ...likesData,
    ...contextMatches.map(m => ({ ...m.user, matchId: m.id } as MatchItem))
  ];

  const sortedItems = [...allItems].sort((a, b) => {
    const dateA = a.likedAt?.getTime() ?? 0;
    const dateB = b.likedAt?.getTime() ?? 0;
    return sortNewest ? dateB - dateA : dateA - dateB;
  });

  const renderCard = (item: MatchItem) => {
    const isMatch = 'matchId' in item && item.matchId;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.card}
        onPress={() => isMatch ? onOpenMatchChat(item.matchId!) : onViewProfile(item.id)}
        activeOpacity={0.92}
        testID={`match-card-${item.id}`}
      >
        <Image
          source={{ uri: item.photos?.[0] || 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=640&auto=format&fit=crop' }}
          style={styles.cardImage}
        />

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.75)']}
          style={styles.cardGradient}
        />

        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.name}, {item.age}</Text>
          {item.likedAt && (
            <Text style={styles.cardTime}>{formatTimeAgo(item.likedAt)}</Text>
          )}
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

        {isMatch && (
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>Match</Text>
          </View>
        )}

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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Matches</Text>
          <View style={styles.countRow}>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{allItems.length}</Text>
            </View>
            <Text style={styles.subtitle}>
              People who liked you
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.sortBtn}
          activeOpacity={0.7}
          onPress={() => setSortNewest(!sortNewest)}
        >
          <ArrowUpDown size={20} color="#FF2D55" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {tier === 'free' && allItems.length > 0 && (
        <TouchableOpacity
          style={styles.upgradeBanner}
          onPress={() => router.push('/premium' as any)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#FF2D55', '#FF6B8A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.upgradeBannerGradient}
          >
            <Sparkles size={16} color="#FFF" />
            <Text style={styles.upgradeBannerText}>Upgrade to see who likes you first</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#FF2D55" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : allItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Heart size={36} color="#FF2D55" />
          </View>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptyText}>Start swiping to find your perfect match!</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderGrid(sortedItems)}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: PADDING,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#1A1A1A',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    backgroundColor: '#FF2D55',
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#FFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '400' as const,
  },
  sortBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
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
  upgradeBanner: {
    marginHorizontal: PADDING,
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  upgradeBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  upgradeBannerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: PADDING,
    paddingBottom: 120,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
  },
  cardPlaceholder: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
    left: 12,
    right: 12,
    bottom: 50,
  },
  cardName: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
    fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardTime: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  cardActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 42,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.35)',
    backdropFilter: 'blur(10px)',
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF2D55',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  matchBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#22C55E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  matchBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFE5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingText: {
    fontSize: 15,
    color: '#9CA3AF',
    marginTop: 12,
  },
});
