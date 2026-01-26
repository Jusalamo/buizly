import { useState } from 'react';
import { ChevronDown, ChevronUp, Users, Plug, Calendar, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { OptimizedAvatar } from '@/components/OptimizedAvatar';
import { Button } from '@/components/ui/button';
import type { Notification, NotificationType } from '@/types/database';
import { cn } from '@/lib/utils';

interface NotificationGroupProps {
  type: NotificationType;
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onAccept?: (notificationId: string) => Promise<void>;
  onDecline?: (notificationId: string) => Promise<void>;
}

const typeLabels: Record<NotificationType, string> = {
  new_connection: 'Connection requests',
  plug_request: 'Plug introductions',
  meeting_request: 'Meeting requests',
  meeting_confirmed: 'Confirmed meetings',
  meeting_declined: 'Declined meetings',
  meeting_cancelled: 'Cancelled meetings',
  meeting_rescheduled: 'Rescheduled meetings',
  meeting_reminder: 'Meeting reminders',
  new_participant: 'New participants',
  profile_shared: 'Profile shares',
  follow_up_scheduled: 'Follow-ups',
};

const typeIcons: Record<NotificationType, React.ReactNode> = {
  new_connection: <Users className="h-4 w-4" />,
  plug_request: <Plug className="h-4 w-4" />,
  meeting_request: <Calendar className="h-4 w-4" />,
  meeting_confirmed: <Calendar className="h-4 w-4" />,
  meeting_declined: <Calendar className="h-4 w-4" />,
  meeting_cancelled: <Calendar className="h-4 w-4" />,
  meeting_rescheduled: <Calendar className="h-4 w-4" />,
  meeting_reminder: <Bell className="h-4 w-4" />,
  new_participant: <Users className="h-4 w-4" />,
  profile_shared: <Users className="h-4 w-4" />,
  follow_up_scheduled: <Calendar className="h-4 w-4" />,
};

export function NotificationGroup({ 
  type, 
  notifications, 
  onNotificationClick,
  onAccept,
  onDecline 
}: NotificationGroupProps) {
  const [expanded, setExpanded] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.read).length;
  const displayNotifications = expanded ? notifications : notifications.slice(0, 3);
  const hasMore = notifications.length > 3;

  // Get avatars for stacked display
  const uniqueAvatars = notifications
    .map(n => ({
      url: n.data?.requester_avatar || n.data?.sender_avatar || n.data?.connection_avatar,
      name: n.data?.requester_name || n.data?.sender_name || n.data?.connection_name
    }))
    .filter(a => a.url)
    .slice(0, 3);

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Group Header */}
      <div 
        className={cn(
          "flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50 transition-colors",
          unreadCount > 0 && "bg-primary/5"
        )}
        onClick={() => hasMore && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {/* Stacked avatars or icon */}
          {uniqueAvatars.length > 0 ? (
            <div className="flex -space-x-2">
              {uniqueAvatars.map((avatar, i) => (
                <OptimizedAvatar
                  key={i}
                  src={avatar.url}
                  fallback={avatar.name?.charAt(0) || '?'}
                  className="h-8 w-8 border-2 border-card"
                />
              ))}
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              {typeIcons[type]}
            </div>
          )}
          
          <div>
            <p className="font-medium text-sm text-foreground">
              {notifications.length} {typeLabels[type] || 'notifications'}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notifications[0].created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
              {unreadCount}
            </span>
          )}
          {hasMore && (
            expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Individual Notifications */}
      <div className={cn(
        "overflow-hidden transition-all duration-200",
        expanded ? "max-h-[1000px]" : "max-h-0"
      )}>
        {displayNotifications.map((notification) => (
          <NotificationGroupItem
            key={notification.id}
            notification={notification}
            onClick={() => onNotificationClick(notification)}
            onAccept={onAccept}
            onDecline={onDecline}
          />
        ))}
      </div>

      {/* Show More / Show Less */}
      {hasMore && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full py-2 text-xs text-primary hover:text-primary/80 font-medium"
        >
          View {notifications.length - 3} more
        </button>
      )}
    </div>
  );
}

interface NotificationGroupItemProps {
  notification: Notification;
  onClick: () => void;
  onAccept?: (notificationId: string) => Promise<void>;
  onDecline?: (notificationId: string) => Promise<void>;
}

function NotificationGroupItem({ notification, onClick, onAccept, onDecline }: NotificationGroupItemProps) {
  const [processing, setProcessing] = useState(false);
  
  const avatarUrl = notification.data?.requester_avatar || 
                    notification.data?.sender_avatar ||
                    notification.data?.connection_avatar;
  const personName = notification.data?.requester_name || 
                     notification.data?.sender_name ||
                     notification.data?.connection_name;

  const showActions = (notification.type === 'new_connection' || notification.type === 'plug_request') 
    && onAccept && onDecline;

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (processing) return;
    setProcessing(true);
    try {
      await onAccept?.(notification.id);
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (processing) return;
    setProcessing(true);
    try {
      await onDecline?.(notification.id);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 p-3 pl-6 cursor-pointer hover:bg-accent/30 transition-colors",
        !notification.read && "bg-primary/5"
      )}
    >
      <OptimizedAvatar
        src={avatarUrl}
        fallback={personName?.charAt(0) || '?'}
        className="h-8 w-8 shrink-0"
      />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground line-clamp-1">{notification.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{notification.message}</p>
        
        {showActions && (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={processing}
              className="h-7 text-xs"
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDecline}
              disabled={processing}
              className="h-7 text-xs"
            >
              Decline
            </Button>
          </div>
        )}
      </div>
      
      {!notification.read && (
        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
      )}
    </div>
  );
}
