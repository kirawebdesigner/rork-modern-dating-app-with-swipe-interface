import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { ArrowLeft, Send, ShieldAlert, Crown } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Message } from '@/types';
import { useMembership } from '@/hooks/membership-context';
import { useAuth } from '@/hooks/auth-context';
import { supabase } from '@/lib/supabase';
import { useRealtimeMessages } from '@/hooks/use-chat';

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
  const { tier, remainingDailyMessages, useDaily } = useMembership();
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
    const load = async () => {
      if (!chatId || !uid) { setInitLoading(false); return; }
      try {
        const { data: convParts, error: cpErr } = await supabase
          .from('conversation_participants')
          .select('conversation_id, user_id')
          .eq('conversation_id', chatId);
        if (cpErr) throw cpErr;
        const other = (convParts as any[]).find(p => p.user_id !== uid)?.user_id as string | undefined;
        if (!other) throw new Error('Participant not found');
        setOtherId(other);
        const { data: prof, error: pErr } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', other)
          .maybeSingle();
        if (pErr) throw pErr;
        setOtherName((prof?.name as string) ?? 'User');
      } catch (e) {
        console.error('[Chat] init other user error', e);
      } finally {
        if (active) setInitLoading(false);
      }
    };
    load();
    return () => { active = false; };
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
    if (tier === 'free') {
      const allowed = await useDaily('messages');
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
  }, [input, router, tier, useDaily, sendMessage]);

  const renderItem = useCallback(({ item }: { item: Message }) => {
    const isMine = uid != null && item.senderId === uid;
    return (
      <View
        style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}
        testID={isMine ? 'message-bubble-mine' : 'message-bubble-theirs'}
      >
        <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>{item.text}</Text>
        <Text style={[styles.time, isMine ? styles.timeMine : styles.timeTheirs]}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
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
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} testID="chat-back">
            <ArrowLeft size={22} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1} testID="chat-title">{otherName}</Text>
          {tier === 'free' ? (
            <View style={styles.headerRight}>
              <Crown size={18} color={Colors.primary} />
              <Text style={styles.headerBadgeText}>{remainingDailyMessages}</Text>
            </View>
          ) : (
            <View style={styles.headerRight} />
          )}
        </View>

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

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message"
              placeholderTextColor={Colors.text.light}
              editable={!sending}
              testID="chat-input"
            />
            <TouchableOpacity
              onPress={onSend}
              style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
              disabled={!input.trim() || sending}
              testID="chat-send"
            >
              <Send size={18} color={(!input.trim() || sending) ? Colors.text.light : Colors.text.white} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Boundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backBtn: { padding: 8 },
  title: { flex: 1, marginHorizontal: 12, fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerBadgeText: { color: Colors.primary, fontWeight: '700' },
  listContent: { padding: 12, gap: 8 },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: Colors.primary },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: Colors.backgroundSecondary },
  bubbleText: { fontSize: 15 },
  bubbleTextMine: { color: Colors.text.white },
  bubbleTextTheirs: { color: Colors.text.primary },
  time: { fontSize: 10, marginTop: 4 },
  timeMine: { color: '#F0F0F0' },
  timeTheirs: { color: Colors.text.light },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: Colors.backgroundSecondary,
    color: Colors.text.primary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  sendBtnDisabled: { backgroundColor: '#D0D4DA' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  loadingText: { color: Colors.text.secondary },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6, paddingHorizontal: 24 },
  errorTitle: { fontWeight: '700', color: Colors.error, fontSize: 16 },
  errorText: { color: Colors.text.secondary, textAlign: 'center' },
});