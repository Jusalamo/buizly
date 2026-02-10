import { Home, Users, UserPlus, Calendar, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useNotificationsOptimistic } from "@/hooks/useNotificationsOptimistic";
import { useMemo, useEffect, useRef } from "react";

const navItems = [
  { to: "/", icon: Home, label: "Home", matchPaths: ["/", "/meeting", "/notes"], notifType: null, tourId: "dashboard" },
  { to: "/network", icon: Users, label: "Network", matchPaths: ["/network", "/connection"], notifType: "network", tourId: "network" },
  { to: "/discover", icon: UserPlus, label: "Add", matchPaths: ["/discover", "/capture"], notifType: null, tourId: "capture" },
  { to: "/schedule", icon: Calendar, label: "Schedule", matchPaths: ["/schedule", "/calendar"], notifType: "schedule", tourId: "schedule" },
  { to: "/settings", icon: Settings, label: "Settings", matchPaths: ["/settings", "/profile", "/analytics", "/subscription"], notifType: null, tourId: "settings" },
];

export const BottomNav = () => {
  const location = useLocation();
  const { notifications, markAsRead } = useNotificationsOptimistic();
  const previousPath = useRef<string>("");
  
  const notificationCounts = useMemo(() => {
    const unread = notifications.filter(n => !n.read);
    
    return {
      network: unread.filter(n => n.type === 'new_connection' || n.type === 'plug_request').length,
      schedule: unread.filter(n => 
        n.type === 'meeting_request' || 
        n.type === 'meeting_confirmed' || 
        n.type === 'meeting_reminder' ||
        n.type === 'meeting_rescheduled'
      ).length,
    };
  }, [notifications]);
  
  useEffect(() => {
    const currentPath = location.pathname;
    if (previousPath.current === currentPath) return;
    previousPath.current = currentPath;
    
    const unread = notifications.filter(n => !n.read);
    
    if (currentPath.startsWith('/network')) {
      const networkNotifs = unread.filter(n => 
        n.type === 'new_connection' || n.type === 'plug_request'
      );
      networkNotifs.forEach(n => markAsRead(n.id));
    }
    
    if (currentPath.startsWith('/schedule') || currentPath.startsWith('/calendar')) {
      const scheduleNotifs = unread.filter(n => 
        n.type === 'meeting_request' || 
        n.type === 'meeting_confirmed' || 
        n.type === 'meeting_reminder' ||
        n.type === 'meeting_rescheduled'
      );
      scheduleNotifs.forEach(n => markAsRead(n.id));
    }
  }, [location.pathname, notifications, markAsRead]);
  
  const isActive = (matchPaths: string[]) => {
    return matchPaths.some(path => {
      if (path === "/") return location.pathname === "/";
      return location.pathname.startsWith(path);
    });
  };

  const getCount = (notifType: string | null) => {
    if (!notifType) return 0;
    return notificationCounts[notifType as keyof typeof notificationCounts] || 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 pb-safe">
      <div className="max-w-screen-xl mx-auto flex justify-around items-center h-16 px-4" style={{ paddingBottom: 'var(--safe-area-bottom)' }}>
        {navItems.map(({ to, icon: Icon, label, matchPaths, notifType, tourId }) => {
          const count = getCount(notifType);
          return (
            <Link
              key={to}
              to={to}
              data-tour={tourId}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 transition-colors relative",
                isActive(matchPaths) ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon className="h-6 w-6 mb-1" />
                {count > 0 && (
                  <span className="absolute -top-1 -right-2 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </div>
              <span className="text-xs">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
