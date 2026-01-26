import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotificationsOptimistic } from "@/hooks/useNotificationsOptimistic";
import { NotificationList } from "@/components/notifications/NotificationList";
import { NotificationToast } from "@/components/notifications/NotificationToast";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    loading, 
    hasNewNotification,
    newToasts,
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    dismissToast
  } = useNotificationsOptimistic();

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <>
      {/* Toast notifications - show when panel is closed */}
      {!open && newToasts.map((toast) => (
        <NotificationToast
          key={toast.id}
          notification={toast}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-foreground hover:bg-card-surface"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1">
                {/* Badge with count */}
                <span className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium",
                  hasNewNotification && "animate-pulse"
                )}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
                {/* Ping animation for new notifications */}
                {hasNewNotification && (
                  <span className="absolute inset-0 rounded-full bg-primary opacity-75 animate-ping" />
                )}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-card border-border">
          {/* Header */}
          <SheetHeader className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-foreground">Notifications</SheetTitle>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-primary hover:text-primary/80 text-xs h-auto py-1 px-2"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </SheetHeader>
          
          {/* Notification List */}
          <ScrollArea className="h-[calc(100vh-80px)]">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No notifications yet</p>
                <p className="text-sm mt-1">We'll notify you when something happens</p>
              </div>
            ) : (
              <NotificationList 
                notifications={notifications}
                onMarkRead={markAsRead}
                onDelete={deleteNotification}
                onClose={() => setOpen(false)}
                grouped={true}
              />
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
