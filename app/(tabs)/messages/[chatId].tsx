import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Alert, StatusBar, Image, Linking, ActionSheetIOS } from 'react-native';
import { ChevronLeft, Send, ShieldAlert, MoreVertical, Smile, Mic, Check, Phone, Flag, Ban, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Message } from '@/types';
import { useMembership } from '@/hooks/membership-context';
import { useAuth } from '@/hooks/auth-context';
import { supabase } from '@/lib/supabase';
import { useRealtimeMessages } from '@/hooks/use-chat';
import { LinearGradient } from 'expo-linear-gradient';

class Boundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.error('[Chat] ErrorBoundary', error); }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorWrap}>
          <ShieldAlert size={28} color={Colors.error} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>Please go back and try again.</Text>
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

export default function ChatScreen() {
  const router = useRouter();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { useDaily: consumeDailyLimit } = useMembership();
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [input, setInput] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const listRef = useRef<FlatList<Message>>(null);

  const [otherId, setOtherId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState<string>('Chat');
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);
  const [otherPhone, setOtherPhone] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const { messages, loading, error, sendMessage } = useRealtimeMessages(chatId ?? null, uid, otherId);

  const [initLoading, setInitLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const failSafe = setTimeout(() => {
      if (active) {
        console.log('[Chat] init timeout fallback');
        setInitLoading(false);
      }
    }, 3500);
    const load = async () => {
      if (!chatId || !uid) { setInitLoading(false); return; }
      try {
        console.log('[Chat] init loading participants for chatId', chatId);
        const { data: convParts, error: cpErr } = await supabase
          .from('conversation_participants')
          .select('conversation_id, user_id')
          .eq('conversation_id', chatId);
        if (cpErr) throw cpErr;
        let other: string | undefined = (convParts as any[] | null)?.find(p => p.user_id !== uid)?.user_id as string | undefined;

        if (!other) {
          console.log('[Chat] No other participant, trying messages');
          const { data: msgs, error: mErr } = await supabase
            .from('messages')
            .select('sender_id')
            .eq('conversation_id', chatId)
            .order('created_at', { ascending: false })
            .limit(50);
          if (mErr) console.log('[Chat] Messages fetch error', mErr);
          other = (msgs as any[] | null)?.map(r => r.sender_id as string).find(id => id !== uid);
        }

        if (!other) {
          console.log('[Chat] Trying to find match for conversation');
          const { data: match, error: matchErr } = await supabase
            .from('matches')
            .select('user1_id, user2_id, id')
            .eq('id', chatId)
            .maybeSingle();
          if (!matchErr && match) {
            other = (match.user1_id === uid ? match.user2_id : match.user1_id) as string;
            console.log('[Chat] Found other user from match:', other);

            const { data: existingConv } = await supabase
              .from('conversations')
              .select('id')
              .eq('id', chatId)
              .maybeSingle();

            if (!existingConv) {
              console.log('[Chat] Creating missing conversation and participants');
              await supabase.from('conversations').insert({ id: chatId, created_by: uid });
              await supabase.from('conversation_participants').insert([
                { conversation_id: chatId, user_id: uid },
                { conversation_id: chatId, user_id: other }
              ]);
            }
          }
        }

        if (!other) {
          console.warn('[Chat] Could not find other participant');
          setOtherId(null);
          setOtherName('Unknown');
        } else {
          setOtherId(other);
          const { data: prof, error: pErr } = await supabase
            .from('profiles')
            .select('name, photos')
            .eq('id', other)
            .maybeSingle();
          if (pErr) console.log('[Chat] Profile fetch error', pErr);
          setOtherName((prof?.name as string) ?? 'User');
          const photos = prof?.photos as string[] | null;
          if (photos && photos.length > 0) {
            setOtherAvatar(photos[0]);
          }
          const { data: phoneProf } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', other)
            .maybeSingle();
          if (phoneProf?.phone) setOtherPhone(phoneProf.phone as string);
        }
      } catch (e) {
        console.error('[Chat] init error', e);
      } finally {
        if (active) setInitLoading(false);
        clearTimeout(failSafe);
      }
    };
    load();
    return () => { active = false; clearTimeout(failSafe); };
  }, [chatId, uid]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, scrollToEnd]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleCall = useCallback(() => {
    Alert.alert(
      'Call ' + otherName,
      'Voice calling will be available soon. You can reach out via message for now.',
      [
        { text: 'OK', style: 'cancel' },
        ...(otherPhone ? [{
          text: 'Call via Phone',
          onPress: () => {
            Linking.openURL(`tel:${otherPhone}`).catch(() => {
              Alert.alert('Unable to make call', 'Phone calling is not supported on this device.');
            });
          },
        }] : []),
      ]
    );
  }, [otherName, otherPhone]);

  const handleMoreOptions = useCallback(() => {
    const options = [
      {
        text: 'View Profile',
        onPress: () => {
          if (otherId) {
            router.push(`/(tabs)/profile-details/${otherId}` as any);
          }
        },
      },
      {
        text: 'Clear Chat',
        onPress: () => {
          Alert.alert(
            'Clear Chat',
            'Are you sure you want to clear this conversation?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Clear',
                style: 'destructive',
                onPress: async () => {
                  try {
                    if (chatId) {
                      await supabase.from('messages').delete().eq('conversation_id', chatId);
                      Alert.alert('Chat cleared');
                    }
                  } catch (e) {
                    console.log('[Chat] Clear chat error:', e);
                  }
                },
              },
            ]
          );
        },
      },
      {
        text: 'Report User',
        onPress: () => {
          Alert.alert(
            'Report User',
            'Are you sure you want to report this user?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Report',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await supabase.from('reports').insert({
                      reported_id: otherId,
                      reason: 'Reported from chat',
                      created_at: new Date().toISOString(),
                    });
                    Alert.alert('Report Submitted', 'Thank you for your report. We will review it.');
                  } catch (e) {
                    console.log('[Chat] Report error:', e);
                  }
                },
              },
            ]
          );
        },
      },
      {
        text: 'Block User',
        onPress: () => {
          Alert.alert(
            'Block User',
            `Are you sure you want to block ${otherName}? You won't see each other anymore.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Block',
                style: 'destructive',
                onPress: () => {
                  Alert.alert('User Blocked', `${otherName} has been blocked.`);
                  router.back();
                },
              },
            ]
          );
        },
      },
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'View Profile', 'Clear Chat', 'Report User', 'Block User'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 4,
        },
        (buttonIndex) => {
          if (buttonIndex > 0 && buttonIndex <= options.length) {
            options[buttonIndex - 1].onPress();
          }
        }
      );
    } else {
      Alert.alert(
        'Options',
        undefined,
        [
          ...options.map(opt => ({ text: opt.text, onPress: opt.onPress })),
          { text: 'Cancel', style: 'cancel' as const },
        ]
      );
    }
  }, [otherId, otherName, chatId, router]);

  const onSend = useCallback(async () => {
    if (!input.trim()) return;
    const allowed = await consumeDailyLimit('messages');
    if (!allowed) {
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
    try {
      setSending(true);
      await sendMessage(input.trim());
      setInput('');
    } catch (e) {
      console.error('[Chat] send error', e);
      Alert.alert('Failed to send', 'Please try again.');
    } finally {
      setSending(false);
    }
  }, [input, router, consumeDailyLimit, sendMessage]);

  const formatMessageTime = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const renderDateSeparator = () => (
    <View style={styles.dateSeparator}>
      <View style={styles.dateLine} />
      <Text style={styles.dateText}>Today</Text>
      <View style={styles.dateLine} />
    </View>
  );

  const renderItem = useCallback(({ item, index }: { item: Message, index: number }) => {
    const isMine = uid != null && item.senderId === uid;
    const showDateSeparator = index === 0;

    return (
      <View>
        {showDateSeparator && renderDateSeparator()}
        <View style={[styles.messageWrapper, isMine ? styles.messageWrapperMine : styles.messageWrapperTheirs]}>
          {isMine ? (
            <LinearGradient
              colors={['#FF2D55', '#FF6B8A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sentBubble}
            >
              <Text style={styles.sentText}>{item.text}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.receivedBubble}>
              <Text style={styles.receivedText}>{item.text}</Text>
            </View>
          )}
          <View style={[styles.timeRow, isMine ? styles.timeRowMine : styles.timeRowTheirs]}>
            <Text style={styles.timeText}>{formatMessageTime(item.timestamp)}</Text>
            {isMine && (
              <View style={styles.readReceipt}>
                <Check size={11} color="#FF2D55" strokeWidth={3} />
                <Check size={11} color="#FF2D55" strokeWidth={3} style={styles.checkOverlap} />
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }, [uid]);

  if (initLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#FF2D55" size="large" />
          <Text style={styles.loadingText}>Connecting...</Text>
        </View>
      </View>
    );
  }

  return (
    <Boundary>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn} testID="chat-back">
              <ChevronLeft size={26} color="#1A1A1A" strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.headerProfile} activeOpacity={0.8}>
              <View style={styles.avatarWrapper}>
                {otherAvatar ? (
                  <Image source={{ uri: otherAvatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.placeholderAvatar]}>
                    <Text style={styles.placeholderText}>
                      {otherName.substring(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.onlineDot} />
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
                <Text style={styles.onlineText}>Online now</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerActionBtn} onPress={handleCall} testID="chat-call">
                <Phone size={18} color="#1A1A1A" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionBtn} onPress={handleMoreOptions} testID="chat-more">
                <MoreVertical size={18} color="#1A1A1A" />
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.flex}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color="#FF2D55" />
                <Text style={styles.loadingText}>Loading history...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorWrap}>
                <ShieldAlert size={28} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(m) => m.id}
                renderItem={renderItem}
                contentContainerStyle={[styles.listContent, messages.length === 0 && styles.emptyListContent]}
                testID="chat-list"
                showsVerticalScrollIndicator={false}
                style={styles.flex}
                ListEmptyComponent={
                  <View style={styles.emptyChat}>
                    <Text style={styles.emptyChatEmoji}>👋</Text>
                    <Text style={styles.emptyChatTitle}>Say hello!</Text>
                    <Text style={styles.emptyChatText}>Send the first message to start the conversation</Text>
                  </View>
                }
              />
            )}

            <View style={[styles.composerContainer, { paddingBottom: Math.max(insets.bottom + 70, Platform.OS === 'ios' ? 100 : 90) }]}>
              <View style={styles.inputWrapper}>
                <TouchableOpacity style={styles.emojiBtn}>
                  <Smile size={22} color="#9CA3AF" />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Type a message..."
                  placeholderTextColor="#9CA3AF"
                  editable={!sending}
                  testID="chat-input"
                  multiline
                  maxLength={1000}
                />
              </View>

              <TouchableOpacity
                onPress={input.trim() ? onSend : undefined}
                disabled={sending}
                testID="chat-send"
                activeOpacity={0.8}
              >
                {input.trim() ? (
                  <LinearGradient
                    colors={['#FF2D55', '#FF6B8A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sendBtn}
                  >
                    <Send size={18} color="#FFF" style={{ marginLeft: 2 }} />
                  </LinearGradient>
                ) : (
                  <View style={styles.micBtnInner}>
                    <Mic size={20} color="#FF2D55" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Boundary>
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
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  avatarWrapper: {
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  placeholderAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE5E9',
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FF2D55',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginBottom: 1,
  },
  onlineText: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '500' as const,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center' as const,
  },
  emptyChat: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyChatEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyChatTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyChatText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500' as const,
    marginHorizontal: 16,
  },
  messageWrapper: {
    marginBottom: 4,
    maxWidth: '78%',
  },
  messageWrapperMine: {
    alignSelf: 'flex-end',
  },
  messageWrapperTheirs: {
    alignSelf: 'flex-start',
  },
  receivedBubble: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderTopLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  receivedText: {
    fontSize: 15,
    color: '#1A1A1A',
    lineHeight: 22,
  },
  sentBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderTopRightRadius: 4,
  },
  sentText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
    gap: 4,
  },
  timeRowMine: {
    justifyContent: 'flex-end',
  },
  timeRowTheirs: {
    justifyContent: 'flex-start',
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '400' as const,
  },
  readReceipt: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkOverlap: {
    marginLeft: -7,
  },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  emojiBtn: {
    padding: 8,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 12,
    color: '#1A1A1A',
    fontSize: 15,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '500' as const,
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontWeight: '700' as const,
    color: Colors.error,
    fontSize: 18,
  },
  errorText: {
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 15,
  },
});
