import { useNavigate } from 'react-router-dom';
import { NotificationItem } from './NotificationItem';
import { useConnectionRequests } from '@/hooks/useConnectionRequests';
import type { Notification } from '@/types/database';

interface NotificationListProps {
  notifications: Notification[];
  onMarkRead: (notificationId: string) => void;
  onDelete: (notificationId: string) => void;
  onClose?: () => void;
}

export function NotificationList({
  notifications,
  onMarkRead,
  onDelete,
  onClose,
}: NotificationListProps) {
  const navigate = useNavigate();
  const { acceptRequest, declineRequest, incomingRequests } = useConnectionRequests();

  const handleAccept = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    // Find the corresponding connection request
    const requesterId = notification.data?.requester_id;
    if (requesterId) {
      const request = incomingRequests.find(r => r.requester_id === requesterId);
      if (request) {
        await acceptRequest(request.id);
      }
    }
    
    // Delete the notification after action
    onDelete(notificationId);
    onMarkRead(notificationId);
  };

  const handleDecline = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    // Find the corresponding connection request
    const requesterId = notification.data?.requester_id;
    if (requesterId) {
      const request = incomingRequests.find(r => r.requester_id === requesterId);
      if (request) {
        await declineRequest(request.id);
      }
    }
    
    // Delete the notification after action
    onDelete(notificationId);
  };

  const handleView = (notification: Notification) => {
    onClose?.();
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'new_connection':
        if (notification.data?.connection_id) {
          navigate(`/profile/${notification.data.connection_id}`);
        } else if (notification.data?.requester_id) {
          navigate(`/profile/${notification.data.requester_id}`);
        } else {
          navigate('/network');
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
        if (notification.data?.meeting_id) {
          navigate(`/meeting/${notification.data.meeting_id}`);
        } else {
          navigate('/schedule');
        }
        break;
      case 'profile_shared':
        if (notification.data?.profile_id) {
          navigate(`/profile/${notification.data.profile_id}`);
        }
        break;
      default:
        break;
    }

    onMarkRead(notification.id);
  };

  // Check if notification is actionable (has pending request)
  const isActionable = (notification: Notification): boolean => {
    if (notification.type !== 'new_connection') return false;
    const requesterId = notification.data?.requester_id;
    if (!requesterId) return false;
    return incomingRequests.some(r => r.requester_id === requesterId && r.status === 'pending');
  };

  return (
    <div className="divide-y divide-border">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onAccept={isActionable(notification) ? handleAccept : undefined}
          onDecline={isActionable(notification) ? handleDecline : undefined}
          onView={handleView}
          onMarkRead={onMarkRead}
        />
      ))}
    </div>
  );
}
