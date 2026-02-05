import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, SafeAreaView, Platform, StatusBar, ScrollView } from 'react-native';
import { MessageCircle, Crown, ChevronRight, Search } from 'lucide-react-native';
import Colors from '@/constants/colors';
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

  const handleConversationPress = useCallback(async (item: MatchListItem) => {
    const canMessage = await consumeDailyLimit('messages');
    if (!canMessage && tier === 'free') {
      Alert.alert(
        'Daily Limit Reached',
        "You've reached your daily message limit.",
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/premium' as any) },
        ]
      );
      return;
    }
    router.push({ pathname: '/(tabs)/messages/[chatId]', params: { chatId: item.id } } as any);
  }, [router, tier, consumeDailyLimit]);

  const getTimeSince = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const isToday = now.getDate() === date.getDate() && 
                    now.getMonth() === date.getMonth() && 
                    now.getFullYear() === date.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = yesterday.getDate() === date.getDate() &&
                        yesterday.getMonth() === date.getMonth() &&
                        yesterday.getFullYear() === date.getFullYear();
    
    if (isYesterday) return 'Yesterday';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
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

    return { newMatches: newMatchesList, conversations: conversationsList };
  }, [items]);

  const renderNewMatch = ({ item }: { item: MatchListItem }) => (
    <TouchableOpacity 
      style={styles.newMatchItem} 
      onPress={() => handleConversationPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.newMatchAvatarContainer}>
        {item.otherUserAvatar ? (
          <Image source={{ uri: item.otherUserAvatar }} style={styles.newMatchAvatar} />
        ) : (
          <View style={[styles.newMatchAvatar, styles.placeholderAvatar]}>
            <Text style={styles.placeholderInitials}>
              {item.otherUserName.substring(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.onlineIndicator} />
      </View>
      <Text style={styles.newMatchName} numberOfLines={1}>{item.otherUserName}</Text>
    </TouchableOpacity>
  );

  const renderConversation = ({ item }: { item: MatchListItem }) => {
    const lastMessage = item.lastMessage;
    const timeSince = lastMessage ? getTimeSince(new Date(lastMessage.timestamp)) : '';
    const isMine = lastMessage?.senderId === uid;

    return (
      <TouchableOpacity 
        style={styles.conversationCard} 
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
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

        <View style={styles.conversationContent}>
          <View style={styles.rowTop}>
            <Text style={styles.userName} numberOfLines={1}>{item.otherUserName}</Text>
            <Text style={styles.timestamp}>{timeSince}</Text>
          </View>
          
          <View style={styles.rowBottom}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {isMine && <Text style={styles.youPrefix}>You: </Text>}
              {lastMessage?.text}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      {newMatches.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New Matches</Text>
          <FlatList
            horizontal
            data={newMatches}
            renderItem={renderNewMatch}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.newMatchesList}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}
      {newMatches.length > 0 && conversations.length > 0 && (
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Conversations</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container} testID="messages-screen">
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Search size={22} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>

        {tier === 'free' && (
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => router.push('/premium' as any)}
            style={styles.bannerWrapper}
          >
            <LinearGradient
              colors={[Colors.gradient.start, Colors.gradient.end]}
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
              <MessageCircle size={32} color={Colors.primary} />
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerWrapper: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  limitsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  limitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  limitsText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  newMatchesList: {
    paddingHorizontal: 24,
    gap: 16,
  },
  newMatchItem: {
    alignItems: 'center',
    width: 72,
  },
  newMatchAvatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  newMatchAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  newMatchName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0F0',
  },
  placeholderAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  placeholderInitials: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
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
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.text.light,
    fontWeight: '500',
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.text.secondary,
    flex: 1,
    lineHeight: 20,
  },
  youPrefix: {
    color: Colors.text.primary,
    fontWeight: '500',
  },
  centerContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.text.secondary,
    marginTop: 12,
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
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
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
