import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, SafeAreaView } from 'react-native';
import { MessageCircle, Crown, Send } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useMembership } from '@/hooks/membership-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/auth-context';
import { useUserMatches, MatchListItem } from '@/hooks/use-chat';

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const { items, loading } = useUserMatches(uid);
  const { tier, remainingDailyMessages, useDaily: consumeDailyLimit } = useMembership();

  const handleConversationPress = useCallback(async (item: MatchListItem) => {
    console.log('[Messages] Open conversation', { id: item.id });
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
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'now';
  }, []);

  const data = useMemo(() => items, [items]);

  const renderConversation = ({ item }: { item: MatchListItem }) => {
    const lastMessage = item.lastMessage;
    const timeSince = lastMessage ? getTimeSince(new Date(lastMessage.timestamp)) : '';
    return (
      <TouchableOpacity style={styles.conversationCard} onPress={() => handleConversationPress(item)}>
        {item.otherUserAvatar ? (
          <Image source={{ uri: item.otherUserAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholderAvatar]} />
        )}
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={styles.userName}>{item.otherUserName}</Text>
            <Text style={styles.timestamp}>{timeSince}</Text>
          </View>
          {lastMessage && (
            <Text style={[styles.lastMessage]} numberOfLines={1}>
              {lastMessage.senderId === uid ? 'You: ' : ''}
              {lastMessage.text}
            </Text>
          )}
        </View>
        <View style={styles.messageActions}>
          {tier === 'free' && remainingDailyMessages <= 3 && (
            <Crown size={16} color={Colors.primary} />
          )}
          <Send size={16} color={Colors.text.light} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} testID="messages-screen">
      <View style={styles.header} testID="messages-header">
        <View style={styles.headerContent}>
          <Text style={styles.title}>Messages</Text>
          <MessageCircle size={24} color={Colors.primary} />
        </View>
        {tier === 'free' && (
          <TouchableOpacity style={styles.limitsBanner} onPress={() => router.push('/premium' as any)}>
            <Text style={styles.limitsText}>{remainingDailyMessages} messages left today</Text>
            <Crown size={16} color={Colors.text.white} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.emptyContainer} testID="messages-loading"><Text style={styles.emptySubtext}>Loading…</Text></View>
      ) : data.length === 0 ? (
        <View style={styles.emptyContainer} testID="messages-empty">
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>Start a conversation with your matches!</Text>
        </View>
      ) : (
        <FlatList
          testID="messages-list"
          data={data}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={() => (tier === 'free' ? <View style={styles.footerAdWrap}><View style={styles.adBanner}><Text style={styles.adText}>Ad Placeholder</Text></View></View> : null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  limitsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  limitsText: {
    color: Colors.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    paddingVertical: 8,
  },
  separator: { height: 6 },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  placeholderAvatar: {
    backgroundColor: Colors.backgroundSecondary,
  },
  unreadDot: {
    position: 'absolute',
    left: 64,
    top: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  conversationInfo: {
    flex: 1,
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.text.light,
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  unreadMessage: {
    color: Colors.text.primary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  adBanner: {
    marginHorizontal: 20,
    marginVertical: 8,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#E9ECF2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  adText: { color: Colors.text.secondary, fontWeight: '600' },
  footerAdWrap: { paddingVertical: 8 },
});