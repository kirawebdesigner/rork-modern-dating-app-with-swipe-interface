import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  userId: string;
  type: 'upgrade' | 'match' | 'message' | 'like' | 'superlike' | 'system';
  title: string;
  content: string;
  read: boolean;
  data: Record<string, any>;
  createdAt: Date;
}

interface DbNotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string;
  read: boolean;
  data: any;
  created_at: string;
}

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const mapRow = useCallback((row: DbNotificationRow): Notification => {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as Notification['type'],
      title: row.title,
      content: row.content,
      read: row.read,
      data: row.data ?? {},
      createdAt: new Date(row.created_at),
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      setUnreadCount(0);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (fetchError) throw fetchError;
        if (!active) return;

        const mapped = (data as unknown as DbNotificationRow[]).map(mapRow);
        setNotifications(mapped);
        setUnreadCount(mapped.filter(n => !n.read).length);

        console.log('[Notifications] Loaded', mapped.length, 'notifications,', mapped.filter(n => !n.read).length, 'unread');
      } catch (e: any) {
        console.error('[Notifications] fetch error', e);
        if (active) setError(e?.message ?? 'Failed to load notifications');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    if (channelRef.current) {
      try {
        channelRef.current.unsubscribe();
      } catch {}
    }

    const channel = supabase.channel(`notifications-user-${userId}`);
    
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      console.log('[Notifications] New notification received:', payload);
      const row = payload.new as unknown as DbNotificationRow;
      const notification = mapRow(row);
      
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      const row = payload.new as unknown as DbNotificationRow;
      const notification = mapRow(row);
      
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? notification : n)
      );
      
      setUnreadCount(prev => {
        const oldNotif = notifications.find(n => n.id === notification.id);
        if (oldNotif && !oldNotif.read && notification.read) {
          return Math.max(0, prev - 1);
        }
        return prev;
      });
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Notifications] Subscribed to real-time updates');
      }
    });

    channelRef.current = channel;

    return () => {
      active = false;
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
        } catch {}
        channelRef.current = null;
      }
    };
  }, [userId, mapRow, notifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e: any) {
      console.error('[Notifications] mark as read error', e);
    }
  }, [userId]);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e: any) {
      console.error('[Notifications] mark all as read error', e);
    }
  }, [userId]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!userId) return;

    try {
      const notif = notifications.find(n => n.id === notificationId);
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (notif && !notif.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (e: any) {
      console.error('[Notifications] delete error', e);
    }
  }, [userId, notifications]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
