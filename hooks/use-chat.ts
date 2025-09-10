import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Message } from '@/types';

interface DbMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export function useRealtimeMessages(conversationId: string | null, currentUserId: string | null, otherUserId?: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const mapRow = useCallback((row: DbMessageRow): Message => {
    const receiverId = row.sender_id === (currentUserId ?? '') ? (otherUserId ?? '') : (currentUserId ?? '');
    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId,
      text: row.content,
      timestamp: new Date(row.created_at),
      read: true,
    };
  }, [currentUserId, otherUserId]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from('messages')
          .select('id, conversation_id, sender_id, content, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        if (!active) return;
        const mapped = (data as unknown as DbMessageRow[]).map(mapRow);
        setMessages(mapped);
      } catch (e: any) {
        console.error('[Chat] fetch messages error', e);
        setError(e?.message ?? 'Failed to load messages');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();

    if (channelRef.current) {
      try { channelRef.current.unsubscribe(); } catch {}
    }

    const channel = supabase.channel(`messages-conv-${conversationId}`);
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => {
      const row = payload.new as unknown as DbMessageRow;
      const msg = mapRow(row);
      setMessages(prev => [...prev, msg]);
    });
    channel.subscribe((status) => { if (status === 'SUBSCRIBED') console.log('[Chat] subscribed messages'); });
    channelRef.current = channel;

    return () => {
      active = false;
      if (channelRef.current) {
        try { channelRef.current.unsubscribe(); } catch {}
        channelRef.current = null;
      }
    };
  }, [conversationId, mapRow]);

  const sendMessage = useCallback(async (text: string) => {
    if (!conversationId || !currentUserId) throw new Error('Missing identifiers');
    const trimmed = text.trim();
    if (!trimmed) return;

    const patterns: RegExp[] = [
      /\b(?:\+?\d[\s-]?){7,}\d\b/g,
      /@/g,
      /(?:whats?app|telegram|tg\.?|insta(?:gram)?|snap(?:chat)?)/gi,
      /https?:\/\/[\w.-]+/gi,
      /\b(?:t\.me|wa\.me|bit\.ly|linktr\.ee|ig\.me)\/[\w-]+/gi,
    ];
    let sanitized = trimmed;
    for (const re of patterns) {
      sanitized = sanitized.replace(re, '###');
    }

    const insert = {
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: sanitized,
    };
    const { error } = await supabase.from('messages').insert(insert);
    if (error) throw error;
  }, [conversationId, currentUserId]);

  return { messages, loading, error, sendMessage };
}

export interface MatchListItem {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  lastMessage?: Message;
}

export function useUserMatches(userId: string | null) {
  const [items, setItems] = useState<MatchListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: parts, error: pErr } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', userId);
        if (pErr) throw pErr;
        const conversationIds = (parts ?? []).map((p: any) => p.conversation_id as string);

        if (conversationIds.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }

        const [{ data: convParts, error: cpErr }, { data: msgs, error: mErr }] = await Promise.all([
          supabase
            .from('conversation_participants')
            .select('conversation_id, user_id')
            .in('conversation_id', conversationIds),
          supabase
            .from('messages')
            .select('id, conversation_id, sender_id, content, created_at')
            .in('conversation_id', conversationIds),
        ]);
        if (cpErr) throw cpErr;
        if (mErr) throw mErr;

        const otherByConv = new Map<string, string>();
        (convParts as any[]).forEach((r) => {
          if (r.user_id !== userId) otherByConv.set(r.conversation_id as string, r.user_id as string);
        });
        const otherIds = Array.from(new Set(Array.from(otherByConv.values())));
        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('id,name,photos')
          .in('id', otherIds);
        if (profErr) throw profErr;

        const latestByConv = new Map<string, DbMessageRow>();
        (msgs as DbMessageRow[]).forEach((m) => {
          const prev = latestByConv.get(m.conversation_id);
          if (!prev || new Date(m.created_at).getTime() > new Date(prev.created_at).getTime()) {
            latestByConv.set(m.conversation_id, m);
          }
        });

        const itemsNext: MatchListItem[] = conversationIds.map((cid) => {
          const otherId = otherByConv.get(cid) as string;
          const prof = (profiles as any[]).find((p) => p.id === otherId);
          const latest = latestByConv.get(cid);
          return {
            id: cid,
            otherUserId: otherId,
            otherUserName: prof?.name ?? 'User',
            otherUserAvatar: Array.isArray(prof?.photos) && prof.photos.length ? prof.photos[0] : null,
            lastMessage: latest ? {
              id: latest.id,
              senderId: latest.sender_id,
              receiverId: latest.sender_id === userId ? otherId : userId,
              text: latest.content,
              timestamp: new Date(latest.created_at),
              read: true,
            } : undefined,
          };
        });

        if (!active) return;
        setItems(itemsNext.sort((a, b) => {
          const at = a.lastMessage?.timestamp?.getTime() ?? 0;
          const bt = b.lastMessage?.timestamp?.getTime() ?? 0;
          return bt - at;
        }));
      } catch (e: any) {
        console.error('[Chat] load conversations error', e);
        setError(e?.message ?? 'Failed to load conversations');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    const channel = supabase.channel(`conversations-of-${userId}`);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${userId}` }, () => load());
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      const row = payload.new as DbMessageRow;
      void load();
    });
    channel.subscribe((status) => { if (status === 'SUBSCRIBED') console.log('[Chat] subscribed conversations'); });

    return () => { try { channel.unsubscribe(); } catch {} };
  }, [userId]);

  return { items, loading, error };
}
