import { useEffect, useState } from 'react';
import { X, Users, Plug, Calendar, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OptimizedAvatar } from '@/components/OptimizedAvatar';
import type { Notification, NotificationType } from '@/types/database';
import { cn } from '@/lib/utils';

interface NotificationToastProps {
  notification: Notification;
  onDismiss: () => void;
  duration?: number;
}

const typeConfig: Record<NotificationType, { icon: React.ReactNode; bgColor: string }> = {
  new_connection: { icon: <Users className="h-4 w-4" />, bgColor: 'bg-primary/20' },
  plug_request: { icon: <Plug className="h-4 w-4" />, bgColor: 'bg-accent' },
  meeting_request: { icon: <Calendar className="h-4 w-4" />, bgColor: 'bg-primary/20' },
  meeting_confirmed: { icon: <Calendar className="h-4 w-4" />, bgColor: 'bg-status-success/20' },
  meeting_declined: { icon: <Calendar className="h-4 w-4" />, bgColor: 'bg-status-error/20' },
  meeting_cancelled: { icon: <Calendar className="h-4 w-4" />, bgColor: 'bg-status-error/20' },
  meeting_rescheduled: { icon: <Calendar className="h-4 w-4" />, bgColor: 'bg-status-warning/20' },
  meeting_reminder: { icon: <Bell className="h-4 w-4" />, bgColor: 'bg-primary/20' },
  new_participant: { icon: <Users className="h-4 w-4" />, bgColor: 'bg-primary/20' },
  profile_shared: { icon: <Users className="h-4 w-4" />, bgColor: 'bg-primary/20' },
  follow_up_scheduled: { icon: <Calendar className="h-4 w-4" />, bgColor: 'bg-primary/20' },
};

export function NotificationToast({ notification, onDismiss, duration = 5000 }: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));
    
    // Auto dismiss
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 300);
  };

  const handleClick = () => {
    const data = notification.data;
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'new_connection':
        if (data?.request_id) {
          navigate('/discover');
        } else if (data?.requester_id) {
          navigate(`/u/${data.requester_id}`);
        }
        break;
      case 'plug_request':
        if (data?.plug_id) {
          navigate('/network');
        }
        break;
      case 'meeting_request':
      case 'meeting_confirmed':
      case 'meeting_cancelled':
      case 'meeting_rescheduled':
      case 'meeting_reminder':
        if (data?.meeting_id) {
          navigate(`/meeting/${data.meeting_id}`);
        }
        break;
      default:
        break;
    }
    
    handleDismiss();
  };

  const config = typeConfig[notification.type] || { 
    icon: <Bell className="h-4 w-4" />, 
    bgColor: 'bg-muted' 
  };

  const avatarUrl = notification.data?.requester_avatar || 
                    notification.data?.sender_avatar ||
                    notification.data?.connection_avatar;
  const personName = notification.data?.requester_name || 
                     notification.data?.sender_name ||
                     notification.data?.connection_name;

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-[100] max-w-sm w-full transform transition-all duration-300 ease-out",
        isVisible && !isExiting ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <div 
        onClick={handleClick}
        className="bg-card border border-border rounded-lg shadow-lg p-4 cursor-pointer hover:bg-card/80 transition-colors"
      >
        <div className="flex items-start gap-3">
          {avatarUrl ? (
            <OptimizedAvatar
              src={avatarUrl}
              fallback={personName?.charAt(0) || '?'}
              className="h-10 w-10 shrink-0"
            />
          ) : (
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              config.bgColor
            )}>
              {config.icon}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground line-clamp-1">
              {notification.title}
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {notification.message}
            </p>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Toast container for managing multiple toasts
interface ToastContainerProps {
  toasts: Notification[];
  onDismiss: (id: string) => void;
}

export function NotificationToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {toasts.slice(0, 3).map((toast, index) => (
        <div 
          key={toast.id}
          style={{ transform: `translateY(${index * 8}px)` }}
        >
          <NotificationToast
            notification={toast}
            onDismiss={() => onDismiss(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}
