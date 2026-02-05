import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Alert, StatusBar, Image } from 'react-native';
import { ChevronLeft, Send, ShieldAlert, MoreVertical, Smile, Mic, Check } from 'lucide-react-native';
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

  const { messages, loading, error, sendMessage } = useRealtimeMessages(chatId ?? null, uid, otherId);

  const [initLoading, setInitLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const failSafe = setTimeout(() => {
      if (active) {
        console.log('[Chat] init timeout fallback — continuing without participant');
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
          console.log('[Chat] No other participant in participants table, trying messages');
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
            <View style={styles.sentBubble}>
              <Text style={styles.sentText}>{item.text}</Text>
            </View>
          ) : (
            <View style={styles.receivedBubble}>
              <Text style={styles.receivedText}>{item.text}</Text>
            </View>
          )}
          <View style={[styles.timeRow, isMine ? styles.timeRowMine : styles.timeRowTheirs]}>
            <Text style={styles.timeText}>{formatMessageTime(item.timestamp)}</Text>
            {isMine && (
              <View style={styles.readReceipt}>
                <Check size={12} color="#FF4D67" strokeWidth={3} />
                <Check size={12} color="#FF4D67" strokeWidth={3} style={styles.checkOverlap} />
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
          <ActivityIndicator color="#FF4D67" size="large" />
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
          <View style={styles.dragHandle} />
          
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn} testID="chat-back">
              <ChevronLeft size={28} color="#1A1A1A" strokeWidth={2} />
            </TouchableOpacity>
            
            <View style={styles.headerProfile}>
              <View style={styles.avatarWrapper}>
                <LinearGradient
                  colors={['#FF6B6B', '#FF8E53', '#FFA726']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarGradient}
                >
                  <View style={styles.avatarInner}>
                    {otherAvatar ? (
                      <Image source={{ uri: otherAvatar }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.placeholderAvatar]}>
                        <Text style={styles.placeholderText}>
                          {otherName.substring(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
                <View style={styles.onlineStatus}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>Online</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.moreBtn}>
              <MoreVertical size={22} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.flex}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color="#FF4D67" />
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
                contentContainerStyle={styles.listContent}
                testID="chat-list"
                showsVerticalScrollIndicator={false}
              />
            )}

            <View style={styles.composerContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Your message"
                  placeholderTextColor="#9CA3AF"
                  editable={!sending}
                  testID="chat-input"
                  multiline
                  maxLength={1000}
                />
                <TouchableOpacity style={styles.emojiBtn}>
                  <Smile size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                onPress={input.trim() ? onSend : undefined}
                disabled={sending}
                testID="chat-send"
                activeOpacity={0.8}
                style={styles.micBtn}
              >
                {input.trim() ? (
                  <LinearGradient
                    colors={['#FF4D67', '#FF8E53']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sendGradient}
                  >
                    <Send size={20} color="#FFF" style={{ marginLeft: 2 }} />
                  </LinearGradient>
                ) : (
                  <View style={styles.micBtnInner}>
                    <Mic size={22} color="#FF4D67" />
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
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: { flex: 1 },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  backBtn: { 
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  avatarWrapper: {
    marginRight: 12,
  },
  avatarGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 2.5,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
  },
  placeholderAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE5E9',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF4D67',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1A1A1A',
    marginBottom: 2,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4D67',
  },
  onlineText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  moreBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
  },
  listContent: { 
    paddingHorizontal: 20, 
    paddingTop: 16,
    paddingBottom: 24,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
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
  messageWrapper: {
    marginBottom: 4,
    maxWidth: '80%',
  },
  messageWrapperMine: {
    alignSelf: 'flex-end',
  },
  messageWrapperTheirs: {
    alignSelf: 'flex-start',
  },
  receivedBubble: { 
    backgroundColor: '#FFE5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderTopLeftRadius: 4,
  },
  receivedText: { 
    fontSize: 15, 
    color: '#1A1A1A',
    lineHeight: 22,
  },
  sentBubble: { 
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderTopRightRadius: 4,
  },
  sentText: { 
    fontSize: 15, 
    color: '#1A1A1A',
    lineHeight: 22,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
    gap: 4,
  },
  timeRowMine: {
    justifyContent: 'flex-end',
  },
  timeRowTheirs: {
    justifyContent: 'flex-start',
  },
  timeText: { 
    fontSize: 12, 
    color: '#9CA3AF',
    fontWeight: '400',
  },
  readReceipt: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkOverlap: {
    marginLeft: -8,
  },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F5F5F5',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingVertical: 8,
    color: '#1A1A1A',
    fontSize: 16,
  },
  emojiBtn: {
    padding: 8,
  },
  micBtn: {
    width: 52,
    height: 52,
  },
  micBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFE5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
  errorWrap: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 8, 
    paddingHorizontal: 32,
  },
  errorTitle: { 
    fontWeight: '700', 
    color: Colors.error, 
    fontSize: 18,
  },
  errorText: { 
    color: '#6B7280', 
    textAlign: 'center',
    fontSize: 15,
  },
});
