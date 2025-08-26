import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Message } from '@/types';

interface DbMessageRow {
  id: string;
  match_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean | null;
  created_at: string;
}

export function useRealtimeMessages(matchId: string | null, currentUserId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const mapRow = useCallback((row: DbMessageRow): Message => ({
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    text: row.content,
    timestamp: new Date(row.created_at),
    read: Boolean(row.read),
  }), []);

  useEffect(() => {
    if (!matchId) {
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
          .select('*')
          .eq('match_id', matchId)
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

    const channel = supabase.channel(`messages-match-${matchId}`);
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `match_id=eq.${matchId}`,
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
  }, [matchId, mapRow]);

  const sendMessage = useCallback(async (text: string) => {
    if (!matchId || !currentUserId) throw new Error('Missing identifiers');
    const trimmed = text.trim();
    if (!trimmed) return;

    const patterns: RegExp[] = [
      /\b(?:\+?\d[\s-]?){7,}\d\b/g, // phone-like
      /@/g, // email indicator
      /(?:whats?app|telegram|tg\.?|insta(?:gram)?|snap(?:chat)?)/gi,
      /https?:\/\/[\w.-]+/gi,
      /\b(?:t\.me|wa\.me|bit\.ly|linktr\.ee|ig\.me)\/[\w-]+/gi,
    ];
    let sanitized = trimmed;
    for (const re of patterns) {
      sanitized = sanitized.replace(re, '###');
    }

    const { data: matchRow, error: matchErr } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .eq('id', matchId)
      .maybeSingle();
    if (matchErr || !matchRow) throw matchErr ?? new Error('Match not found');
    const receiver = (matchRow.user1_id === currentUserId) ? matchRow.user2_id : matchRow.user1_id;
    const insert = {
      match_id: matchId,
      sender_id: currentUserId,
      receiver_id: receiver as string,
      content: sanitized,
    };
    const { error } = await supabase.from('messages').insert(insert);
    if (error) throw error;
  }, [matchId, currentUserId]);

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
        const { data: matches, error: mErr } = await supabase
          .from('matches')
          .select('*')
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
          .order('matched_at', { ascending: false });
        if (mErr) throw mErr;
        const matchIds = (matches ?? []).map((m: any) => m.id as string);
        const otherIds = (matches ?? []).map((m: any) => (m.user1_id === userId ? m.user2_id : m.user1_id) as string);

        const [{ data: profiles, error: pErr }, { data: msgs, error: msgErr }] = await Promise.all([
          supabase.from('profiles').select('id,name,photos').in('id', otherIds),
          matchIds.length ? supabase
            .from('messages')
            .select('id, match_id, sender_id, receiver_id, content, read, created_at')
            .in('match_id', matchIds) : Promise.resolve({ data: [], error: null } as any),
        ]);
        if (pErr) throw pErr;
        if (msgErr) throw msgErr;

        const latestByMatch = new Map<string, DbMessageRow>();
        (msgs as DbMessageRow[]).forEach((m) => {
          const prev = latestByMatch.get(m.match_id);
          if (!prev || new Date(m.created_at).getTime() > new Date(prev.created_at).getTime()) {
            latestByMatch.set(m.match_id, m);
          }
        });

        const itemsNext: MatchListItem[] = (matches ?? []).map((m: any) => {
          const otherId = m.user1_id === userId ? (m.user2_id as string) : (m.user1_id as string);
          const prof = (profiles as any[]).find((p) => p.id === otherId);
          const latest = latestByMatch.get(m.id as string);
          return {
            id: m.id as string,
            otherUserId: otherId,
            otherUserName: prof?.name ?? 'User',
            otherUserAvatar: Array.isArray(prof?.photos) && prof.photos.length ? prof.photos[0] : null,
            lastMessage: latest ? {
              id: latest.id,
              senderId: latest.sender_id,
              receiverId: latest.receiver_id,
              text: latest.content,
              timestamp: new Date(latest.created_at),
              read: Boolean(latest.read),
            } : undefined,
          };
        });

        if (!active) return;
        setItems(itemsNext);
      } catch (e: any) {
        console.error('[Chat] load matches error', e);
        setError(e?.message ?? 'Failed to load matches');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    const channel = supabase.channel(`matches-of-${userId}`);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `user1_id=eq.${userId}` }, () => load());
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `user2_id=eq.${userId}` }, () => load());
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => load());
    channel.subscribe((status) => { if (status === 'SUBSCRIBED') console.log('[Chat] subscribed matches'); });

    return () => { try { channel.unsubscribe(); } catch {} };
  }, [userId]);

  return { items, loading, error };
}
