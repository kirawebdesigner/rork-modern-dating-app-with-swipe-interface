import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { ArrowLeft, Send, ShieldAlert, Crown, MoreVertical, Phone, Video } from 'lucide-react-native';
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
  const { tier, remainingDailyMessages, useDaily: consumeDailyLimit } = useMembership();
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [input, setInput] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const listRef = useRef<FlatList<Message>>(null);

  const [otherId, setOtherId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState<string>('Chat');

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
            .select('name')
            .eq('id', other)
            .maybeSingle();
          if (pErr) console.log('[Chat] Profile fetch error', pErr);
          setOtherName((prof?.name as string) ?? 'User');
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

  const renderItem = useCallback(({ item, index }: { item: Message, index: number }) => {
    const isMine = uid != null && item.senderId === uid;
    
    // Check if next message is from same sender to group them visually (reduce border radius, margin)
    const nextMessage = messages[index + 1];
    const isNextMine = nextMessage && nextMessage.senderId === item.senderId;
    
    return (
      <View style={[styles.messageWrapper, isMine ? styles.messageWrapperMine : styles.messageWrapperTheirs, isNextMine ? styles.groupedMessage : styles.lastInGroup]}>
        {isMine ? (
          <LinearGradient
            colors={[Colors.gradient.start, Colors.gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubbleMine, isNextMine && styles.bubbleMineGrouped]}
          >
            <Text style={styles.bubbleTextMine}>{item.text}</Text>
            <Text style={styles.timeMine}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </LinearGradient>
        ) : (
          <View style={[styles.bubbleTheirs, isNextMine && styles.bubbleTheirsGrouped]} testID="message-bubble-theirs">
            <Text style={styles.bubbleTextTheirs}>{item.text}</Text>
            <Text style={styles.timeTheirs}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
      </View>
    );
  }, [uid, messages]);

  if (initLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
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
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={handleBack} style={styles.backBtn} testID="chat-back">
                <ArrowLeft size={24} color={Colors.text.primary} strokeWidth={2.5} />
              </TouchableOpacity>
              <View style={styles.headerInfo}>
                <Text style={styles.title} numberOfLines={1} testID="chat-title">{otherName}</Text>
                <Text style={styles.subtitle}>Active now</Text>
              </View>
            </View>
            
            <View style={styles.headerRightActions}>
              {/* Fake call buttons for sleek look */}
              <TouchableOpacity style={styles.iconBtn}>
                <Phone size={20} color={Colors.text.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <Video size={22} color={Colors.text.primary} />
              </TouchableOpacity>

              {tier === 'free' ? (
                <View style={styles.limitBadge}>
                  <Text style={styles.limitText}>{remainingDailyMessages}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.flex}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={Colors.primary} />
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
              <View style={styles.composerShadow}>
                <TextInput
                  style={styles.input}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Type a message..."
                  placeholderTextColor={Colors.text.light}
                  editable={!sending}
                  testID="chat-input"
                  multiline
                  maxLength={1000}
                />
                <TouchableOpacity
                  onPress={onSend}
                  disabled={!input.trim() || sending}
                  testID="chat-send"
                  activeOpacity={0.8}
                >
                  {(!input.trim() || sending) ? (
                    <View style={styles.sendBtnDisabled}>
                      <Send size={20} color={Colors.text.light} />
                    </View>
                  ) : (
                    <LinearGradient
                      colors={[Colors.gradient.start, Colors.gradient.end]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.sendBtn}
                    >
                      <Send size={18} color="#FFF" fill="#FFF" style={{ marginLeft: 2 }} />
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backBtn: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  title: { 
    fontSize: 17, 
    fontWeight: '700', 
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '500',
  },
  iconBtn: {
    padding: 4,
  },
  limitBadge: {
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  limitText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: { 
    paddingHorizontal: 16, 
    paddingTop: 16,
    paddingBottom: 24,
  },
  messageWrapper: {
    marginBottom: 2,
    width: '100%',
  },
  messageWrapperMine: {
    alignItems: 'flex-end',
  },
  messageWrapperTheirs: {
    alignItems: 'flex-start',
  },
  groupedMessage: {
    marginBottom: 2,
  },
  lastInGroup: {
    marginBottom: 12,
  },
  bubbleMine: { 
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomRightRadius: 4,
  },
  bubbleMineGrouped: {
    borderBottomRightRadius: 4,
    borderTopRightRadius: 4,
  },
  bubbleTheirs: { 
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  bubbleTheirsGrouped: {
    borderBottomLeftRadius: 4,
    borderTopLeftRadius: 4,
  },
  bubbleTextMine: { 
    fontSize: 16, 
    color: '#FFFFFF',
    lineHeight: 22,
  },
  bubbleTextTheirs: { 
    fontSize: 16, 
    color: Colors.text.primary,
    lineHeight: 22,
  },
  timeMine: { 
    fontSize: 10, 
    marginTop: 4,
    color: 'rgba(255, 255, 255, 0.7)',
    alignSelf: 'flex-end',
  },
  timeTheirs: { 
    fontSize: 10, 
    marginTop: 4,
    color: Colors.text.light,
    alignSelf: 'flex-start',
  },
  composerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  composerShadow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8F9FA',
    borderRadius: 28,
    padding: 6,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.text.primary,
    fontSize: 16,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  loadingWrap: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 12,
  },
  loadingText: { 
    color: Colors.text.secondary,
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
    color: Colors.text.secondary, 
    textAlign: 'center',
    fontSize: 15,
  },
});
