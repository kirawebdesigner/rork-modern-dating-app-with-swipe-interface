import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, SafeAreaView, StatusBar, TextInput, ScrollView } from 'react-native';
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
    
    if (minutes < 1) return 'now';
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

  const renderActivityItem = (item: MatchListItem, index: number, isCurrentUser: boolean = false) => {
    const hasGradient = index < 2;
    
    return (
      <TouchableOpacity 
        key={item.id}
        style={styles.activityItem} 
        onPress={() => !isCurrentUser && handleConversationPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.activityAvatarWrapper}>
          {hasGradient ? (
            <LinearGradient
              colors={['#FF6B6B', '#FF8E53', '#FFA726']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activityGradientRing}
            >
              <View style={styles.activityAvatarContainer}>
                {item.otherUserAvatar ? (
                  <Image source={{ uri: item.otherUserAvatar }} style={styles.activityAvatar} />
                ) : (
                  <View style={[styles.activityAvatar, styles.placeholderAvatar]}>
                    <Text style={styles.placeholderText}>
                      {isCurrentUser ? 'Y' : item.otherUserName.substring(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          ) : (
            <View style={styles.activityNoGradient}>
              {item.otherUserAvatar ? (
                <Image source={{ uri: item.otherUserAvatar }} style={styles.activityAvatarSimple} />
              ) : (
                <View style={[styles.activityAvatarSimple, styles.placeholderAvatar]}>
                  <Text style={styles.placeholderText}>
                    {item.otherUserName.substring(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        <Text style={styles.activityName} numberOfLines={1}>
          {isCurrentUser ? 'You' : item.otherUserName.split(' ')[0]}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderConversation = ({ item, index }: { item: MatchListItem; index: number }) => {
    const lastMessage = item.lastMessage;
    const timeSince = lastMessage ? getTimeSince(new Date(lastMessage.timestamp)) : '';
    const isMine = lastMessage?.senderId === uid;
    const unreadCount = Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 1 : 0;
    const hasGradient = index % 3 !== 2;

    return (
      <TouchableOpacity 
        style={styles.conversationItem} 
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.conversationAvatarWrapper}>
          {hasGradient ? (
            <LinearGradient
              colors={['#FF6B6B', '#FF8E53', '#FFA726']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.conversationGradientRing}
            >
              <View style={styles.conversationAvatarContainer}>
                {item.otherUserAvatar ? (
                  <Image source={{ uri: item.otherUserAvatar }} style={styles.conversationAvatar} />
                ) : (
                  <View style={[styles.conversationAvatar, styles.placeholderAvatar]}>
                    <Text style={styles.placeholderTextLarge}>
                      {item.otherUserName.substring(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          ) : (
            <View style={styles.conversationNoGradient}>
              {item.otherUserAvatar ? (
                <Image source={{ uri: item.otherUserAvatar }} style={styles.conversationAvatarSimple} />
              ) : (
                <View style={[styles.conversationAvatarSimple, styles.placeholderAvatar]}>
                  <Text style={styles.placeholderTextLarge}>
                    {item.otherUserName.substring(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationRow}>
            <Text style={styles.conversationName} numberOfLines={1}>{item.otherUserName}</Text>
            <Text style={styles.conversationTime}>{timeSince}</Text>
          </View>
          
          <View style={styles.conversationRow}>
            <Text style={styles.conversationMessage} numberOfLines={1}>
              {isMine && <Text style={styles.youLabel}>You: </Text>}
              {lastMessage?.text || 'Start a conversation'}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSeparator = () => (
    <View style={styles.separatorContainer}>
      <View style={styles.separator} />
    </View>
  );

  const renderHeader = () => (
    <View>
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activitiesScrollContent}
          >
            {newMatches.length > 0 && renderActivityItem(newMatches[0], 0, true)}
            {newMatches.map((item, index) => renderActivityItem(item, index + 1, false))}
          </ScrollView>
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
          <TouchableOpacity style={styles.filterButton}>
            <SlidersHorizontal size={22} color="#FF4D67" />
          </TouchableOpacity>
        </View>

        {tier === 'free' && (
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => router.push('/premium' as any)}
            style={styles.premiumBannerWrapper}
          >
            <LinearGradient
              colors={['#FF4D67', '#FF8E53']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumBanner}
            >
              <View style={styles.premiumBannerContent}>
                <Crown size={16} color="#FFF" fill="#FFF" />
                <Text style={styles.premiumBannerText}>
                  {remainingDailyMessages} free messages left today
                </Text>
              </View>
              <ChevronRight size={16} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {loading ? (
          <View style={styles.loadingContainer} testID="messages-loading">
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer} testID="messages-empty">
            <View style={styles.emptyIconWrapper}>
              <MessageCircle size={32} color="#FF4D67" />
            </View>
            <Text style={styles.emptyTitle}>No Matches Yet</Text>
            <Text style={styles.emptyDescription}>
              Start swiping to find your match!
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={renderSeparator}
            ListEmptyComponent={
              newMatches.length > 0 ? (
                <View style={styles.noConversationsContainer}>
                   <Text style={styles.emptyDescription}>No active conversations.</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
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
  premiumBannerWrapper: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  premiumBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumBannerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    padding: 0,
  },
  activitiesSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  activitiesScrollContent: {
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
  activityGradientRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
  },
  activityAvatarContainer: {
    flex: 1,
    borderRadius: 33,
    backgroundColor: '#FFFFFF',
    padding: 2,
    overflow: 'hidden',
  },
  activityAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 31,
  },
  activityNoGradient: {
    width: 72,
    height: 72,
  },
  activityAvatarSimple: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  activityName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 24,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  conversationAvatarWrapper: {
    marginRight: 14,
  },
  conversationGradientRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    padding: 2.5,
  },
  conversationAvatarContainer: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 2,
    overflow: 'hidden',
  },
  conversationAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  conversationNoGradient: {
    width: 62,
    height: 62,
  },
  conversationAvatarSimple: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  placeholderAvatar: {
    backgroundColor: '#FFE5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF4D67',
  },
  placeholderTextLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FF4D67',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 12,
  },
  conversationTime: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  conversationMessage: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    marginRight: 12,
  },
  youLabel: {
    color: '#9CA3AF',
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
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  separatorContainer: {
    paddingLeft: 96,
    paddingRight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
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
  emptyDescription: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  noConversationsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
});
