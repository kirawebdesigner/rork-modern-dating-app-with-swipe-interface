import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { ArrowLeft, Send, ShieldAlert, Crown, MoreVertical } from 'lucide-react-native';
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

  const renderItem = useCallback(({ item }: { item: Message }) => {
    const isMine = uid != null && item.senderId === uid;
    return (
      <View style={[styles.messageWrapper, isMine ? styles.messageWrapperMine : styles.messageWrapperTheirs]}>
        {isMine ? (
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bubbleMine}
          >
            <Text style={styles.bubbleTextMine}>{item.text}</Text>
            <Text style={styles.timeMine}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </LinearGradient>
        ) : (
          <View style={styles.bubbleTheirs} testID="message-bubble-theirs">
            <Text style={styles.bubbleTextTheirs}>{item.text}</Text>
            <Text style={styles.timeTheirs}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
      </View>
    );
  }, [uid]);

  if (initLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.loadingText}>Opening chat…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Boundary>
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[Colors.background, Colors.background]}
          style={styles.header}
        >
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} testID="chat-back">
            <ArrowLeft size={24} color={Colors.text.primary} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title} numberOfLines={1} testID="chat-title">{otherName}</Text>
            <Text style={styles.subtitle}>Active now</Text>
          </View>
          {tier === 'free' ? (
            <View style={styles.headerRight}>
              <View style={styles.badge}>
                <Crown size={14} color={Colors.primary} />
                <Text style={styles.badgeText}>{remainingDailyMessages}</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.headerRight}>
              <MoreVertical size={20} color={Colors.text.secondary} />
            </TouchableOpacity>
          )}
        </LinearGradient>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
          keyboardVerticalOffset={80}
        >
          {loading ? (
            <View style={styles.loadingWrap}><ActivityIndicator color={Colors.primary} /><Text style={styles.loadingText}>Loading messages…</Text></View>
          ) : error ? (
            <View style={styles.errorWrap}><ShieldAlert size={28} color={Colors.error} /><Text style={styles.errorTitle}>Failed to load</Text><Text style={styles.errorText}>{error}</Text></View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              testID="chat-list"
            />
          )}

          <View style={styles.composerWrapper}>
            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Type a message..."
                placeholderTextColor={Colors.text.light}
                editable={!sending}
                testID="chat-input"
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                onPress={onSend}
                style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
                disabled={!input.trim() || sending}
                testID="chat-send"
              >
                {(!input.trim() || sending) ? (
                  <Send size={20} color={Colors.text.light} />
                ) : (
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sendBtnGradient}
                  >
                    <Send size={20} color={Colors.text.white} fill={Colors.text.white} />
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Boundary>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  backBtn: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  title: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#4CD964',
    fontWeight: '600',
    marginTop: 2,
  },
  headerRight: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
  },
  badgeText: { 
    color: Colors.primary, 
    fontWeight: '800',
    fontSize: 13,
  },
  listContent: { 
    padding: 16, 
    gap: 12,
  },
  messageWrapper: {
    marginBottom: 4,
  },
  messageWrapperMine: {
    alignItems: 'flex-end',
  },
  messageWrapperTheirs: {
    alignItems: 'flex-start',
  },
  bubbleMine: { 
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    shadowColor: '#667eea',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bubbleTheirs: { 
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    backgroundColor: Colors.backgroundSecondary,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  bubbleTextMine: { 
    fontSize: 16, 
    color: Colors.text.white,
    lineHeight: 22,
    fontWeight: '500',
  },
  bubbleTextTheirs: { 
    fontSize: 16, 
    color: Colors.text.primary,
    lineHeight: 22,
    fontWeight: '500',
  },
  timeMine: { 
    fontSize: 11, 
    marginTop: 6,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '600',
  },
  timeTheirs: { 
    fontSize: 11, 
    marginTop: 6,
    color: Colors.text.light,
    fontWeight: '600',
  },
  composerWrapper: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: Colors.backgroundSecondary,
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sendBtnGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { 
    backgroundColor: Colors.backgroundSecondary,
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
    fontWeight: '600',
  },
  errorWrap: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 8, 
    paddingHorizontal: 32,
  },
  errorTitle: { 
    fontWeight: '800', 
    color: Colors.error, 
    fontSize: 18,
  },
  errorText: { 
    color: Colors.text.secondary, 
    textAlign: 'center',
    fontSize: 15,
  },
});