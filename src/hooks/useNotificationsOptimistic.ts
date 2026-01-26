import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Notification, NotificationType } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

// Global notification cache for instant access across components
let globalNotifications: Notification[] = [];
let globalUnreadCount = 0;
const subscribers = new Set<() => void>();
const toastSubscribers = new Set<(notification: Notification) => void>();

function notifySubscribers() {
  subscribers.forEach(fn => fn());
}

function notifyToastSubscribers(notification: Notification) {
  toastSubscribers.forEach(fn => fn(notification));
}

export function useNotificationsOptimistic() {
  const [notifications, setNotifications] = useState<Notification[]>(globalNotifications);
  const [unreadCount, setUnreadCount] = useState(globalUnreadCount);
  const [loading, setLoading] = useState(globalNotifications.length === 0);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [newToasts, setNewToasts] = useState<Notification[]>([]);
  const { toast } = useToast();
  const channelRef = useRef<any>(null);
  const userIdRef = useRef<string | null>(null);

  // Subscribe to global state changes
  useEffect(() => {
    const update = () => {
      setNotifications([...globalNotifications]);
      setUnreadCount(globalUnreadCount);
    };
    subscribers.add(update);
    
    // Subscribe to new toast notifications
    const handleNewToast = (notification: Notification) => {
      setNewToasts(prev => [notification, ...prev].slice(0, 3));
      
      // Auto-remove toast after 5 seconds
      setTimeout(() => {
        setNewToasts(prev => prev.filter(t => t.id !== notification.id));
      }, 5000);
    };
    toastSubscribers.add(handleNewToast);
    
    return () => { 
      subscribers.delete(update);
      toastSubscribers.delete(handleNewToast);
    };
  }, []);

  const updateGlobalState = useCallback((newNotifications: Notification[]) => {
    globalNotifications = newNotifications;
    globalUnreadCount = newNotifications.filter(n => !n.read).length;
    notifySubscribers();
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      userIdRef.current = user.id;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const typedData = (data || []).map(item => ({
        ...item,
        type: item.type as NotificationType,
        data: item.data as Record<string, any> | null,
        read: item.read ?? false,
        created_at: item.created_at ?? new Date().toISOString()
      }));

      updateGlobalState(typedData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [updateGlobalState]);

  // Optimistic mark as read
  const markAsRead = useCallback(async (notificationId: string) => {
    // Optimistic update
    const updatedNotifications = globalNotifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    updateGlobalState(updatedNotifications);

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      // Rollback on error
      fetchNotifications();
      console.error('Error marking notification as read:', error);
    }
  }, [updateGlobalState, fetchNotifications]);

  // Optimistic mark all as read
  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    const updatedNotifications = globalNotifications.map(n => ({ ...n, read: true }));
    updateGlobalState(updatedNotifications);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
    } catch (error) {
      // Rollback on error
      fetchNotifications();
      console.error('Error marking all as read:', error);
    }
  }, [updateGlobalState, fetchNotifications]);

  // Optimistic delete
  const deleteNotification = useCallback(async (notificationId: string) => {
    // Optimistic update
    const updatedNotifications = globalNotifications.filter(n => n.id !== notificationId);
    updateGlobalState(updatedNotifications);

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      // Rollback on error
      fetchNotifications();
      console.error('Error deleting notification:', error);
    }
  }, [updateGlobalState, fetchNotifications]);

  // Dismiss toast
  const dismissToast = useCallback((id: string) => {
    setNewToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Create notification
  const createNotification = useCallback(async (
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>
  ) => {
    try {
      const { error } = await supabase.functions.invoke('create-notification', {
        body: { user_id: userId, type, title, message, data: data || null }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    fetchNotifications();

    const setupChannel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      userIdRef.current = user.id;

      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel(`notifications-realtime-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newNotification = {
              ...payload.new,
              type: payload.new.type as NotificationType,
              data: payload.new.data as Record<string, any> | null,
              read: payload.new.read ?? false,
              created_at: payload.new.created_at ?? new Date().toISOString()
            } as Notification;

            // Add to beginning of list
            const updated = [newNotification, ...globalNotifications];
            updateGlobalState(updated);
            setHasNewNotification(true);

            // Trigger toast notification for connection and plug requests
            if (newNotification.type === 'new_connection' || 
                newNotification.type === 'plug_request' ||
                newNotification.type === 'meeting_request') {
              notifyToastSubscribers(newNotification);
            }

            // Show browser notification if permitted
            if (Notification.permission === 'granted') {
              new Notification(newNotification.title || 'Buizly', {
                body: newNotification.message,
                icon: '/favicon.ico'
              });
            }

            // Reset pulse animation after 3 seconds
            setTimeout(() => setHasNewNotification(false), 3000);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const updated = globalNotifications.map(n => 
              n.id === payload.new.id 
                ? { ...n, ...payload.new, type: payload.new.type as NotificationType, data: payload.new.data as Record<string, any> | null }
                : n
            );
            updateGlobalState(updated);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const deletedId = (payload.old as any).id;
            const updated = globalNotifications.filter(n => n.id !== deletedId);
            updateGlobalState(updated);
          }
        )
        .subscribe((status) => {
          console.log('[Notifications] Realtime status:', status);
        });

      channelRef.current = channel;
    };

    setupChannel();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchNotifications, updateGlobalState]);

  return {
    notifications,
    unreadCount,
    loading,
    hasNewNotification,
    newToasts,
    markAsRead,
    markAllAsRead,
    createNotification,
    deleteNotification,
    dismissToast,
    refetch: fetchNotifications
  };
}
