import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, SafeAreaView, StatusBar, TextInput, ScrollView } from 'react-native';
import { MessageCircle, Crown, ChevronRight, Search, SlidersHorizontal, Sparkles } from 'lucide-react-native';
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
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;

    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d`;

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
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.activityItem}
        onPress={() => !isCurrentUser && handleConversationPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.activityAvatarWrapper}>
          {index < 3 ? (
            <LinearGradient
              colors={['#FF2D55', '#FF6B8A', '#FFA726']}
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

  const renderConversation = ({ item }: { item: MatchListItem }) => {
    const lastMessage = item.lastMessage;
    const timeSince = lastMessage ? getTimeSince(new Date(lastMessage.timestamp)) : '';
    const isMine = lastMessage?.senderId === uid;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.conversationAvatarWrapper}>
          {item.otherUserAvatar ? (
            <Image source={{ uri: item.otherUserAvatar }} style={styles.conversationAvatarImg} />
          ) : (
            <View style={[styles.conversationAvatarImg, styles.placeholderAvatar]}>
              <Text style={styles.placeholderTextLarge}>
                {item.otherUserName.substring(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.onlineDotSmall} />
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationRow}>
            <Text style={styles.conversationName} numberOfLines={1}>{item.otherUserName}</Text>
            <Text style={styles.conversationTime}>{timeSince}</Text>
          </View>

          <Text style={styles.conversationMessage} numberOfLines={1}>
            {isMine && <Text style={styles.youLabel}>You: </Text>}
            {lastMessage?.text || 'Say hello! 👋'}
          </Text>
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
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {newMatches.length > 0 && (
        <View style={styles.activitiesSection}>
          <Text style={styles.sectionTitle}>New Matches</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activitiesScrollContent}
          >
            {newMatches.map((item, index) => renderActivityItem(item, index, false))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.sectionTitle}>Conversations</Text>
    </View>
  );

  return (
    <View style={styles.container} testID="messages-screen">
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity style={styles.filterButton}>
            <SlidersHorizontal size={20} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        {tier === 'free' && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/premium' as any)}
            style={styles.premiumBannerWrapper}
          >
            <LinearGradient
              colors={['#FF2D55', '#FF6B8A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumBanner}
            >
              <View style={styles.premiumBannerContent}>
                <Sparkles size={16} color="#FFF" />
                <Text style={styles.premiumBannerText}>
                  {remainingDailyMessages} messages left today
                </Text>
              </View>
              <Text style={styles.upgradeChip}>Upgrade</Text>
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
              <MessageCircle size={32} color="#FF2D55" />
            </View>
            <Text style={styles.emptyTitle}>No Messages Yet</Text>
            <Text style={styles.emptyDescription}>
              Match with someone and start a conversation!
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item.id || `match-${item.otherUserId}`}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={renderSeparator}
            ListEmptyComponent={
              <View style={styles.noConversationsContainer}>
                {newMatches.length > 0 ? (
                  <Text style={styles.emptyDescription}>Tap a match above to start chatting!</Text>
                ) : (
                  <Text style={styles.emptyDescription}>No active conversations yet.</Text>
                )}
              </View>
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
    backgroundColor: '#FAFAFA',
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
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  premiumBannerWrapper: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
  },
  premiumBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumBannerText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  upgradeChip: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#FF2D55',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    padding: 0,
  },
  activitiesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginBottom: 14,
    paddingHorizontal: 20,
  },
  activitiesScrollContent: {
    paddingHorizontal: 20,
    gap: 14,
  },
  activityItem: {
    alignItems: 'center',
    width: 68,
  },
  activityAvatarWrapper: {
    marginBottom: 6,
  },
  activityGradientRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 3,
  },
  activityAvatarContainer: {
    flex: 1,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
    padding: 2,
    overflow: 'hidden',
  },
  activityAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 29,
  },
  activityNoGradient: {
    width: 68,
    height: 68,
  },
  activityAvatarSimple: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  activityName: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 100,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  conversationAvatarWrapper: {
    marginRight: 14,
    position: 'relative',
  },
  conversationAvatarImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F0F0',
  },
  onlineDotSmall: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FAFAFA',
  },
  placeholderAvatar: {
    backgroundColor: '#FFE5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FF2D55',
  },
  placeholderTextLarge: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FF2D55',
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
    fontWeight: '700' as const,
    color: '#1A1A1A',
    flex: 1,
    marginRight: 12,
  },
  conversationTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400' as const,
  },
  conversationMessage: {
    fontSize: 14,
    color: '#6B7280',
  },
  youLabel: {
    color: '#9CA3AF',
  },
  separatorContainer: {
    paddingLeft: 90,
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
    color: '#9CA3AF',
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
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  noConversationsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
});
