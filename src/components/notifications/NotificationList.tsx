import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationGroup } from './NotificationGroup';
import { SwipeableCard } from './SwipeableCard';
import { NotificationItem } from './NotificationItem';
import { useConnectionRequests } from '@/hooks/useConnectionRequests';
import type { Notification, NotificationType } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationListProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClose?: () => void;
  grouped?: boolean;
}

export function NotificationList({ 
  notifications, 
  onMarkRead, 
  onDelete,
  onClose,
  grouped = true 
}: NotificationListProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { acceptRequest, declineRequest, incomingRequests } = useConnectionRequests();
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [mutedTypes, setMutedTypes] = useState<Set<NotificationType>>(new Set());

  // Group notifications by type
  const groupedNotifications = useMemo(() => {
    if (!grouped) return null;

    const groups = new Map<NotificationType, Notification[]>();
    
    // Sort by pinned first, then by date
    const sorted = [...notifications].sort((a, b) => {
      if (pinnedIds.has(a.id) && !pinnedIds.has(b.id)) return -1;
      if (!pinnedIds.has(a.id) && pinnedIds.has(b.id)) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    sorted.forEach(notification => {
      // Skip muted types
      if (mutedTypes.has(notification.type)) return;
      
      const existing = groups.get(notification.type);
      if (existing) {
        existing.push(notification);
      } else {
        groups.set(notification.type, [notification]);
      }
    });
    
    return groups;
  }, [notifications, grouped, pinnedIds, mutedTypes]);

  const handleNotificationClick = useCallback((notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      onMarkRead(notification.id);
    }
    
    // Navigate based on notification type
    const data = notification.data;
    
    switch (notification.type) {
      case 'new_connection':
        if (data?.request_id || data?.requester_id) {
          navigate('/discover');
        }
        break;
      case 'plug_request':
        navigate('/network');
        break;
      case 'meeting_request':
      case 'meeting_confirmed':
      case 'meeting_declined':
      case 'meeting_cancelled':
      case 'meeting_rescheduled':
      case 'meeting_reminder':
        if (data?.meeting_id) {
          navigate(`/meeting/${data.meeting_id}`);
        } else {
          navigate('/schedule');
        }
        break;
      case 'profile_shared':
        if (data?.sharer_id) {
          navigate(`/u/${data.sharer_id}`);
        }
        break;
      case 'follow_up_scheduled':
        navigate('/schedule');
        break;
      default:
        break;
    }
    
    onClose?.();
  }, [navigate, onMarkRead, onClose]);

  const handleAccept = useCallback(async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    try {
      if (notification.type === 'new_connection') {
        const requesterId = notification.data?.requester_id;
        if (requesterId) {
          const request = incomingRequests.find(r => r.requester_id === requesterId);
          if (request) {
            await acceptRequest(request.id);
            toast({ title: 'Connection accepted!' });
            onDelete(notificationId);
          }
        }
      } else if (notification.type === 'plug_request' && notification.data?.plug_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { error } = await supabase
          .from('plug_participants')
          .update({ status: 'accepted', responded_at: new Date().toISOString() })
          .eq('plug_id', notification.data.plug_id)
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        toast({ title: 'Introduction accepted!' });
        onDelete(notificationId);
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [notifications, incomingRequests, acceptRequest, toast, onDelete]);

  const handleDecline = useCallback(async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    try {
      if (notification.type === 'new_connection') {
        const requesterId = notification.data?.requester_id;
        if (requesterId) {
          const request = incomingRequests.find(r => r.requester_id === requesterId);
          if (request) {
            await declineRequest(request.id);
            toast({ title: 'Request declined' });
            onDelete(notificationId);
          }
        }
      } else if (notification.type === 'plug_request' && notification.data?.plug_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { error } = await supabase
          .from('plug_participants')
          .update({ status: 'declined', responded_at: new Date().toISOString() })
          .eq('plug_id', notification.data.plug_id)
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        toast({ title: 'Introduction declined' });
        onDelete(notificationId);
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [notifications, incomingRequests, declineRequest, toast, onDelete]);

  const handlePin = useCallback((id: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleMute = useCallback((type: NotificationType) => {
    setMutedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Check if notification is actionable
  const isActionable = (notification: Notification): boolean => {
    if (notification.type === 'new_connection') {
      const requesterId = notification.data?.requester_id;
      if (!requesterId) return false;
      return incomingRequests.some(r => r.requester_id === requesterId && r.status === 'pending');
    }
    if (notification.type === 'plug_request') {
      return !!notification.data?.plug_id;
    }
    return false;
  };

  // Show grouped view
  if (grouped && groupedNotifications) {
    const entries = Array.from(groupedNotifications.entries());
    
    // Show individual items if only 1 of that type, otherwise group
    return (
      <div className="divide-y divide-border">
        {entries.map(([type, typeNotifications]) => {
          if (typeNotifications.length === 1) {
            const notification = typeNotifications[0];
            return (
              <SwipeableCard
                key={notification.id}
                onDelete={() => onDelete(notification.id)}
                onPin={() => handlePin(notification.id)}
                onMute={() => handleMute(notification.type)}
                isPinned={pinnedIds.has(notification.id)}
              >
                <NotificationItem
                  notification={notification}
                  onAccept={isActionable(notification) ? handleAccept : undefined}
                  onDecline={isActionable(notification) ? handleDecline : undefined}
                  onView={handleNotificationClick}
                  onMarkRead={onMarkRead}
                />
              </SwipeableCard>
            );
          }
          
          return (
            <NotificationGroup
              key={type}
              type={type}
              notifications={typeNotifications}
              onNotificationClick={handleNotificationClick}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          );
        })}
      </div>
    );
  }

  // Show flat list
  return (
    <div className="divide-y divide-border">
      {notifications.map(notification => (
        <SwipeableCard
          key={notification.id}
          onDelete={() => onDelete(notification.id)}
          onPin={() => handlePin(notification.id)}
          onMute={() => handleMute(notification.type)}
          isPinned={pinnedIds.has(notification.id)}
        >
          <NotificationItem
            notification={notification}
            onAccept={isActionable(notification) ? handleAccept : undefined}
            onDecline={isActionable(notification) ? handleDecline : undefined}
            onView={handleNotificationClick}
            onMarkRead={onMarkRead}
          />
        </SwipeableCard>
      ))}
    </div>
  );
}
