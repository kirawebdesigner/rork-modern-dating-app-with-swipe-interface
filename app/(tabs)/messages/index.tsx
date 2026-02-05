import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, SafeAreaView, StatusBar, TextInput } from 'react-native';
import { MessageCircle, Crown, ChevronRight, Search, SlidersHorizontal } from 'lucide-react-native';

import { useMembership } from '@/hooks/membership-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/auth-context';
import { useUserMatches, MatchListItem } from '@/hooks/use-chat';
import { LinearGradient } from 'expo-linear-gradient';

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const { items, loading } = useUserMatches(uid);
  const { tier, remainingDailyMessages, useDaily: consumeDailyLimit } = useMembership();
  const [searchQuery, setSearchQuery] = useState('');

  const handleConversationPress = useCallback(async (item: MatchListItem) => {
    const canMessage = await consumeDailyLimit('messages');
    if (!canMessage && tier === 'free') {
      router.push('/premium' as any);
      return;
    }
    router.push({ pathname: '/(tabs)/messages/[chatId]', params: { chatId: item.id } } as any);
  }, [router, tier, consumeDailyLimit]);

  const getTimeSince = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 60) return `${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  }, []);

  const { newMatches, conversations } = useMemo(() => {
    const newMatchesList: MatchListItem[] = [];
    const conversationsList: MatchListItem[] = [];

    items.forEach(item => {
      if (!item.lastMessage) {
        newMatchesList.push(item);
      } else {
        conversationsList.push(item);
      }
    });

    const filtered = searchQuery.trim() 
      ? conversationsList.filter(c => c.otherUserName.toLowerCase().includes(searchQuery.toLowerCase()))
      : conversationsList;

    return { newMatches: newMatchesList, conversations: filtered };
  }, [items, searchQuery]);

  const renderActivityItem = ({ item, index }: { item: MatchListItem; index: number }) => {
    const isFirst = index === 0;
    return (
      <TouchableOpacity 
        style={styles.activityItem} 
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.activityAvatarWrapper}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53', '#FFA726']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activityGradientBorder}
          >
            <View style={styles.activityAvatarInner}>
              {item.otherUserAvatar ? (
                <Image source={{ uri: item.otherUserAvatar }} style={styles.activityAvatar} />
              ) : (
                <View style={[styles.activityAvatar, styles.placeholderAvatar]}>
                  <Text style={styles.placeholderInitials}>
                    {item.otherUserName.substring(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>
        <Text style={styles.activityName} numberOfLines={1}>
          {isFirst ? 'You' : item.otherUserName.split(' ')[0]}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderConversation = ({ item }: { item: MatchListItem }) => {
    const lastMessage = item.lastMessage;
    const timeSince = lastMessage ? getTimeSince(new Date(lastMessage.timestamp)) : '';
    const isMine = lastMessage?.senderId === uid;
    const unreadCount = Math.floor(Math.random() * 3);

    return (
      <TouchableOpacity 
        style={styles.conversationCard} 
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrapper}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53', '#FFA726']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarGradientBorder}
          >
            <View style={styles.avatarInner}>
              {item.otherUserAvatar ? (
                <Image source={{ uri: item.otherUserAvatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.placeholderAvatar]}>
                  <Text style={styles.placeholderInitials}>
                    {item.otherUserName.substring(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.rowTop}>
            <Text style={styles.userName} numberOfLines={1}>{item.otherUserName}</Text>
            <Text style={styles.timestamp}>{timeSince}</Text>
          </View>
          
          <View style={styles.rowBottom}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {isMine && <Text style={styles.youPrefix}>You: </Text>}
              {lastMessage?.text || 'Start a conversation'}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {newMatches.length > 0 && (
        <View style={styles.activitiesSection}>
          <Text style={styles.sectionTitle}>Activities</Text>
          <FlatList
            horizontal
            data={newMatches}
            renderItem={renderActivityItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.activitiesList}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}
      
      <Text style={styles.sectionTitle}>Messages</Text>
    </View>
  );

  return (
    <View style={styles.container} testID="messages-screen">
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity style={styles.filterBtn}>
            <SlidersHorizontal size={20} color="#FF4D67" />
          </TouchableOpacity>
        </View>

        {tier === 'free' && (
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => router.push('/premium' as any)}
            style={styles.bannerWrapper}
          >
            <LinearGradient
              colors={['#FF4D67', '#FF8E53']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.limitsBanner}
            >
              <View style={styles.limitContent}>
                <Crown size={16} color="#FFF" fill="#FFF" />
                <Text style={styles.limitsText}>
                  {remainingDailyMessages} free messages left today
                </Text>
              </View>
              <ChevronRight size={16} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {loading ? (
          <View style={styles.centerContainer} testID="messages-loading">
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer} testID="messages-empty">
            <View style={styles.emptyIconCircle}>
              <MessageCircle size={32} color="#FF4D67" />
            </View>
            <Text style={styles.emptyTitle}>No Matches Yet</Text>
            <Text style={styles.emptySubtext}>
              Start swiping to find your match!
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              newMatches.length > 0 ? (
                <View style={styles.emptyConversationsContainer}>
                   <Text style={styles.emptySubtext}>No active conversations.</Text>
                </View>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  filterBtn: {
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
  bannerWrapper: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  limitsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  limitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  limitsText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  activitiesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  activitiesList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  activityItem: {
    alignItems: 'center',
    width: 72,
  },
  activityAvatarWrapper: {
    marginBottom: 8,
  },
  activityGradientBorder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
  },
  activityAvatarInner: {
    flex: 1,
    borderRadius: 33,
    backgroundColor: '#FFFFFF',
    padding: 2,
  },
  activityAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 31,
    backgroundColor: '#F0F0F0',
  },
  activityName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  avatarWrapper: {
    marginRight: 14,
  },
  avatarGradientBorder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2.5,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    backgroundColor: '#F0F0F0',
  },
  placeholderAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE5E9',
  },
  placeholderInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF4D67',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    marginRight: 8,
  },
  youPrefix: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  unreadBadge: {
    backgroundColor: '#FF4D67',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginLeft: 94,
    marginRight: 20,
  },
  centerContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B7280',
    marginTop: 12,
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyConversationsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
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
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
