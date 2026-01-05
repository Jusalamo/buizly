import { Home, Users, UserPlus, Calendar, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Home", matchPaths: ["/", "/meeting"] },
  { to: "/network", icon: Users, label: "Network", matchPaths: ["/network", "/connection"] },
  { to: "/discover", icon: UserPlus, label: "Add", matchPaths: ["/discover", "/capture"] },
  { to: "/schedule", icon: Calendar, label: "Schedule", matchPaths: ["/schedule"] },
  { to: "/settings", icon: Settings, label: "Settings", matchPaths: ["/settings", "/profile", "/analytics", "/subscription"] },
];

export const BottomNav = () => {
  const location = useLocation();
  
  const isActive = (matchPaths: string[]) => {
    return matchPaths.some(path => {
      if (path === "/") return location.pathname === "/";
      return location.pathname.startsWith(path);
    });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="max-w-screen-xl mx-auto flex justify-around items-center h-16 px-4">
        {navItems.map(({ to, icon: Icon, label, matchPaths }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-2 transition-colors",
              isActive(matchPaths) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-6 w-6 mb-1" />
            <span className="text-xs">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};
