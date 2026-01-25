import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invalidateAppCache } from '@/hooks/useAppCache';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeOptions {
  onNotification?: (payload: any) => void;
  onConnection?: (payload: any) => void;
  onMeeting?: (payload: any) => void;
  onConnectionRequest?: (payload: any) => void;
  onPlug?: (payload: any) => void;
}

// Global channel reference to prevent duplicate subscriptions
let globalChannel: RealtimeChannel | null = null;
let subscriberCount = 0;

export function useRealtimeSubscription(options: RealtimeOptions = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const userIdRef = useRef<string | null>(null);

  const setupRealtimeChannel = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    userIdRef.current = user.id;

    // If channel already exists and is for the same user, just increment subscriber count
    if (globalChannel && subscriberCount > 0) {
      subscriberCount++;
      return;
    }

    // Clean up existing channel if different user
    if (globalChannel) {
      supabase.removeChannel(globalChannel);
      globalChannel = null;
    }

    // Create comprehensive realtime channel
    const channel = supabase
      .channel('buizly-realtime-v2', {
        config: {
          broadcast: { self: true },
          presence: { key: user.id },
        }
      })
      // Notifications
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[Buizly Realtime] Notification:', payload.eventType);
          optionsRef.current.onNotification?.(payload);
          
          // Show browser notification for new notifications
          if (Notification.permission === 'granted' && payload.eventType === 'INSERT') {
            const notification = payload.new as any;
            new Notification(notification.title || 'Buizly', {
              body: notification.message,
              icon: '/favicon.ico',
              tag: notification.id, // Prevent duplicates
            });
          }
        }
      )
      // Connections (my connections)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[Buizly Realtime] Connection change:', payload.eventType);
          optionsRef.current.onConnection?.(payload);
          invalidateAppCache();
        }
      )
      // Meetings (where I'm organizer or participant)
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
            console.log('[Buizly Realtime] Meeting change:', payload.eventType);
            optionsRef.current.onMeeting?.(payload);
            invalidateAppCache();
          }
        }
      )
      // Connection Requests (where I'm the target)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_requests',
          filter: `target_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[Buizly Realtime] Connection Request:', payload.eventType);
          optionsRef.current.onConnectionRequest?.(payload);
        }
      )
      // Connection Requests (where I'm the requester - for status updates)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_requests',
          filter: `requester_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[Buizly Realtime] My Request Update:', payload.eventType);
          optionsRef.current.onConnectionRequest?.(payload);
        }
      )
      // Plug participants (where I'm involved)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plug_participants',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[Buizly Realtime] Plug participant:', payload.eventType);
          optionsRef.current.onPlug?.(payload);
        }
      )
      .subscribe((status) => {
        console.log('[Buizly Realtime] Subscription status:', status);
      });

    globalChannel = channel;
    subscriberCount = 1;
  }, []);

  useEffect(() => {
    setupRealtimeChannel();

    return () => {
      subscriberCount--;
      if (subscriberCount <= 0 && globalChannel) {
        supabase.removeChannel(globalChannel);
        globalChannel = null;
        subscriberCount = 0;
      }
    };
  }, [setupRealtimeChannel]);

  return {
    reconnect: setupRealtimeChannel
  };
}
