import { useSwipeable } from 'react-swipeable';
import { useState, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '@/types/database';

const notificationIcons: Record<string, string> = {
  meeting_request: "📅",
  meeting_confirmed: "✅",
  meeting_declined: "❌",
  meeting_cancelled: "🚫",
  meeting_rescheduled: "🔄",
  meeting_reminder: "⏰",
  new_participant: "👤",
  profile_shared: "📤",
  new_connection: "🤝",
  follow_up_scheduled: "📆",
  plug_request: "🔌"
};

interface SwipeableNotificationProps {
  notification: Notification;
  onDismiss: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}

export function SwipeableNotification({ 
  notification, 
  onDismiss,
  onMarkRead,
  onDelete 
}: SwipeableNotificationProps) {
  const [offset, setOffset] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const DISMISS_THRESHOLD = 0.4; // 40% of card width
  const cardWidth = cardRef.current?.offsetWidth || 300;
  const threshold = cardWidth * DISMISS_THRESHOLD;

  const handlers = useSwipeable({
    onSwiping: (e) => {
      // Only allow horizontal swipe
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        setOffset(e.deltaX);
      }
    },
    onSwipedLeft: (e) => {
      if (Math.abs(e.deltaX) > threshold) {
        handleDismiss('left');
      } else {
        setOffset(0);
      }
    },
    onSwipedRight: (e) => {
      if (Math.abs(e.deltaX) > threshold) {
        handleDismiss('right');
      } else {
        setOffset(0);
      }
    },
    onSwiped: () => {
      if (Math.abs(offset) < threshold) {
        setOffset(0);
      }
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: true
  });

  const handleDismiss = (direction: 'left' | 'right') => {
    setIsDismissing(true);
    setOffset(direction === 'left' ? -cardWidth : cardWidth);
    
    // Mark as read and delete after animation
    setTimeout(() => {
      if (!notification.read) {
        onMarkRead();
      }
      onDelete();
      onDismiss();
    }, 200);
  };

  // Calculate opacity based on swipe distance
  const opacity = Math.max(0.3, 1 - Math.abs(offset) / cardWidth);
  
  // Background indicators
  const showLeftIndicator = offset < -20;
  const showRightIndicator = offset > 20;

  return (
    <div className="relative overflow-hidden">
      {/* Background indicators */}
      <div className="absolute inset-0 flex items-center justify-between px-4">
        <div className={`transition-opacity duration-150 ${showRightIndicator ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-2 text-primary">
            <span className="text-sm font-medium">Dismiss</span>
          </div>
        </div>
        <div className={`transition-opacity duration-150 ${showLeftIndicator ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-2 text-primary">
            <span className="text-sm font-medium">Dismiss</span>
          </div>
        </div>
      </div>

      {/* Swipeable card - no check/trash buttons, just swipe */}
      <div
        ref={cardRef}
        {...handlers}
        style={{
          transform: `translateX(${offset}px)`,
          opacity,
          transition: isDismissing ? 'transform 200ms ease-out, opacity 200ms ease-out' : 
                     offset === 0 ? 'transform 200ms ease-out' : 'none'
        }}
        className={`relative p-4 bg-card hover:bg-card-surface transition-colors cursor-grab active:cursor-grabbing ${
          !notification.read ? "bg-primary/5" : ""
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="text-xl shrink-0">
            {notificationIcons[notification.type] || "📬"}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground">
              {notification.title}
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {notification.message}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(notification.created_at), { 
                addSuffix: true 
              })}
            </p>
          </div>
          {/* Unread indicator dot */}
          {!notification.read && (
            <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
          )}
        </div>
      </div>
    </div>
  );
}