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
        console.log('[Chat] Loading matches for user:', userId);

        // First, load all matches for this user
        const { data: matchesData, error: matchErr } = await supabase
          .from('matches')
          .select('id, user1_id, user2_id, matched_at')
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
        
        if (matchErr) {
          console.log('[Chat] Error loading matches:', matchErr.message);
          throw matchErr;
        }

        console.log('[Chat] Found matches:', matchesData?.length ?? 0);

        if (!matchesData || matchesData.length === 0) {
          console.log('[Chat] No matches found');
          setItems([]);
          setLoading(false);
          return;
        }

        // Get other user IDs from matches
        const matchMap = new Map<string, { matchId: string; otherId: string; matchedAt: string }>();
        matchesData.forEach((m: any) => {
          const otherId = m.user1_id === userId ? m.user2_id : m.user1_id;
          matchMap.set(m.id, { matchId: m.id, otherId, matchedAt: m.matched_at });
        });

        const matchIds = Array.from(matchMap.keys());
        const otherUserIds = Array.from(new Set(Array.from(matchMap.values()).map(m => m.otherId)));

        console.log('[Chat] Other user IDs:', otherUserIds);

        // Load profiles for matched users
        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('id, name, photos')
          .in('id', otherUserIds);
        
        if (profErr) console.log('[Chat] Profile fetch error:', profErr.message);

        // Ensure conversations exist for all matches
        for (const matchId of matchIds) {
          const matchInfo = matchMap.get(matchId)!;
          const { data: existingConv } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', matchId)
            .maybeSingle();
          
          if (!existingConv) {
            console.log('[Chat] Creating conversation for match:', matchId);
            await supabase.from('conversations').insert({ id: matchId, created_by: userId });
            await supabase.from('conversation_participants').insert([
              { conversation_id: matchId, user_id: userId },
              { conversation_id: matchId, user_id: matchInfo.otherId }
            ]);
          }
        }

        // Load messages for all match conversations
        const { data: msgs, error: mErr } = await supabase
          .from('messages')
          .select('id, conversation_id, sender_id, content, created_at')
          .in('conversation_id', matchIds);
        
        if (mErr) console.log('[Chat] Messages fetch error:', mErr.message);

        // Build latest message map
        const latestByConv = new Map<string, DbMessageRow>();
        ((msgs ?? []) as DbMessageRow[]).forEach((m) => {
          const prev = latestByConv.get(m.conversation_id);
          if (!prev || new Date(m.created_at).getTime() > new Date(prev.created_at).getTime()) {
            latestByConv.set(m.conversation_id, m);
          }
        });

        // Build final list
        const itemsNext: MatchListItem[] = matchIds.map((matchId) => {
          const matchInfo = matchMap.get(matchId)!;
          const prof = (profiles as any[] | null)?.find((p) => p.id === matchInfo.otherId);
          const latest = latestByConv.get(matchId);
          return {
            id: matchId,
            otherUserId: matchInfo.otherId,
            otherUserName: prof?.name ?? 'User',
            otherUserAvatar: Array.isArray(prof?.photos) && prof.photos.length ? prof.photos[0] : null,
            lastMessage: latest ? {
              id: latest.id,
              senderId: latest.sender_id,
              receiverId: latest.sender_id === userId ? matchInfo.otherId : userId,
              text: latest.content,
              timestamp: new Date(latest.created_at),
              read: true,
            } : undefined,
          };
        });

        if (!active) return;
        
        // Sort by last message time, or match time if no messages
        setItems(itemsNext.sort((a, b) => {
          const at = a.lastMessage?.timestamp?.getTime() ?? new Date(matchMap.get(a.id)!.matchedAt).getTime();
          const bt = b.lastMessage?.timestamp?.getTime() ?? new Date(matchMap.get(b.id)!.matchedAt).getTime();
          return bt - at;
        }));
        
        console.log('[Chat] Loaded', itemsNext.length, 'match conversations');
      } catch (e: any) {
        console.error('[Chat] load conversations error', e);
        setError(e?.message ?? 'Failed to load conversations');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    const channel = supabase.channel(`matches-of-${userId}`);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
      console.log('[Chat] Matches changed, reloading...');
      load();
    });
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
      console.log('[Chat] New message, reloading...');
      load();
    });
    channel.subscribe((status) => { if (status === 'SUBSCRIBED') console.log('[Chat] subscribed to matches'); });

    return () => { try { channel.unsubscribe(); } catch {} };
  }, [userId]);

  return { items, loading, error, reload: () => {} };
}
