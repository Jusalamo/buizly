import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invalidateAppCache } from '@/hooks/useAppCache';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeOptions {
  onNotification?: (payload: any) => void;
  onConnection?: (payload: any) => void;
  onMeeting?: (payload: any) => void;
  onConnectionRequest?: (payload: any) => void;
}

export function useRealtimeSubscription(options: RealtimeOptions = {}) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string | null>(null);

  const setupRealtimeChannel = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    userIdRef.current = user.id;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create comprehensive realtime channel
    const channel = supabase
      .channel('buizly-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[Buizly Realtime] Notification:', payload);
          options.onNotification?.(payload);
          
          // Show browser notification if permission granted
          if (Notification.permission === 'granted' && payload.eventType === 'INSERT') {
            const notification = payload.new as any;
            new Notification(notification.title || 'Buizly', {
              body: notification.message,
              icon: '/favicon.ico'
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[Buizly Realtime] Connection:', payload);
          options.onConnection?.(payload);
          invalidateAppCache();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings'
        },
        (payload) => {
          const meeting = payload.new as any;
          if (meeting?.user_id === user.id || meeting?.organizer_id === user.id) {
            console.log('[Buizly Realtime] Meeting:', payload);
            options.onMeeting?.(payload);
            invalidateAppCache();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_requests',
          filter: `target_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[Buizly Realtime] Connection Request:', payload);
          options.onConnectionRequest?.(payload);
        }
      )
      .subscribe((status) => {
        console.log('[Buizly Realtime] Subscription status:', status);
      });

    channelRef.current = channel;
  }, [options]);

  useEffect(() => {
    setupRealtimeChannel();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [setupRealtimeChannel]);

  return {
    reconnect: setupRealtimeChannel
  };
}
