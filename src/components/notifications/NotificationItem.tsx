import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Check, X, User, Calendar, Plug, Share2, Users, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OptimizedAvatar } from '@/components/OptimizedAvatar';
import type { Notification, NotificationType } from '@/types/database';
import { cn } from '@/lib/utils';

interface NotificationConfigItem {
  icon: React.ReactNode;
  bgColor: string;
  actions?: ('accept' | 'decline' | 'view')[];
}

const notificationConfig: Record<NotificationType, NotificationConfigItem> = {
  new_connection: {
    icon: <Users className="h-4 w-4 text-primary" />,
    bgColor: 'bg-primary/10',
    actions: ['accept', 'decline'],
  },
  plug_request: {
    icon: <Plug className="h-4 w-4 text-accent-foreground" />,
    bgColor: 'bg-accent',
    actions: ['accept', 'decline'],
  },
  meeting_request: {
    icon: <Calendar className="h-4 w-4 text-primary" />,
    bgColor: 'bg-primary/10',
    actions: ['accept', 'decline'],
  },
  meeting_confirmed: {
    icon: <Check className="h-4 w-4 text-primary" />,
    bgColor: 'bg-primary/10',
    actions: ['view'],
  },
  meeting_declined: {
    icon: <X className="h-4 w-4 text-destructive" />,
    bgColor: 'bg-destructive/10',
    actions: [],
  },
  meeting_cancelled: {
    icon: <X className="h-4 w-4 text-destructive" />,
    bgColor: 'bg-destructive/10',
    actions: [],
  },
  meeting_rescheduled: {
    icon: <Calendar className="h-4 w-4 text-primary" />,
    bgColor: 'bg-primary/10',
    actions: ['view'],
  },
  meeting_reminder: {
    icon: <Bell className="h-4 w-4 text-primary" />,
    bgColor: 'bg-primary/10',
    actions: ['view'],
  },
  new_participant: {
    icon: <User className="h-4 w-4 text-primary" />,
    bgColor: 'bg-primary/10',
    actions: [],
  },
  profile_shared: {
    icon: <Share2 className="h-4 w-4 text-primary" />,
    bgColor: 'bg-primary/10',
    actions: ['view'],
  },
  follow_up_scheduled: {
    icon: <Calendar className="h-4 w-4 text-primary" />,
    bgColor: 'bg-primary/10',
    actions: ['view'],
  },
};

interface NotificationItemProps {
  notification: Notification;
  onAccept?: (notificationId: string) => Promise<void>;
  onDecline?: (notificationId: string) => Promise<void>;
  onView?: (notification: Notification) => void;
  onMarkRead: (notificationId: string) => void;
}

export function NotificationItem({
  notification,
  onAccept,
  onDecline,
  onView,
  onMarkRead,
}: NotificationItemProps) {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionTaken, setActionTaken] = useState<'accepted' | 'declined' | null>(null);
  
  const config: NotificationConfigItem = notificationConfig[notification.type] || {
    icon: <Bell className="h-4 w-4 text-muted-foreground" />,
    bgColor: 'bg-muted',
    actions: [],
  };

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAccept || isProcessing) return;
    setIsProcessing(true);
    setActionTaken('accepted');
    try {
      await onAccept(notification.id);
    } catch {
      setActionTaken(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDecline || isProcessing) return;
    setIsProcessing(true);
    setActionTaken('declined');
    try {
      await onDecline(notification.id);
    } catch {
      setActionTaken(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = useCallback(() => {
    if (!notification.read) onMarkRead(notification.id);
    const data = notification.data;
    switch (notification.type) {
      case 'new_connection': navigate('/discover'); break;
      case 'plug_request': navigate('/network'); break;
      case 'meeting_request':
      case 'meeting_confirmed':
      case 'meeting_declined':
      case 'meeting_cancelled':
      case 'meeting_rescheduled':
      case 'meeting_reminder':
        navigate(data?.meeting_id ? `/meeting/${data.meeting_id}` : '/schedule'); break;
      case 'profile_shared':
        if (data?.sharer_id) navigate(`/u/${data.sharer_id}`); break;
      case 'follow_up_scheduled':
        navigate(data?.meeting_id ? `/meeting/${data.meeting_id}` : '/calendar'); break;
      default: onView?.(notification); break;
    }
  }, [notification, navigate, onMarkRead, onView]);

  const avatarUrl = notification.data?.requester_avatar || notification.data?.connection_avatar || notification.data?.sender_avatar;
  const personName = notification.data?.requester_name || notification.data?.connection_name || notification.data?.sender_name;

  if (actionTaken) {
    return (
      <div className={cn("p-4 transition-all duration-300", actionTaken === 'accepted' ? 'bg-primary/10' : 'bg-muted/50')}>
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", actionTaken === 'accepted' ? 'bg-primary/20' : 'bg-muted')}>
            {actionTaken === 'accepted' ? <Check className="h-5 w-5 text-primary" /> : <X className="h-5 w-5 text-muted-foreground" />}
          </div>
          <p className="text-sm text-muted-foreground">{actionTaken === 'accepted' ? 'Connection accepted!' : 'Request declined'}</p>
        </div>
      </div>
    );
  }

  const actions = config.actions || [];
  const showAcceptDecline = actions.includes('accept') && actions.includes('decline');

  return (
    <div className={cn("p-4 transition-colors hover:bg-accent/50 cursor-pointer active:bg-accent/70", !notification.read && "bg-primary/5")} onClick={handleClick}>
      <div className="flex items-start gap-3">
        {avatarUrl ? (
          <OptimizedAvatar src={avatarUrl} fallback={personName?.charAt(0) || '?'} className="h-10 w-10 shrink-0" />
        ) : (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", config.bgColor)}>{config.icon}</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-sm text-foreground leading-tight">{notification.title}</p>
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
            </div>
            {!notification.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1 animate-pulse" />}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</p>
          {showAcceptDecline && (
            <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" onClick={handleAccept} disabled={isProcessing} className="flex-1"><Check className="h-4 w-4 mr-1" />Accept</Button>
              <Button size="sm" variant="outline" onClick={handleDecline} disabled={isProcessing} className="flex-1"><X className="h-4 w-4 mr-1" />Decline</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
