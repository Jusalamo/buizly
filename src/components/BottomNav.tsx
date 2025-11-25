import { Home, Users, Camera, Calendar, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/network", icon: Users, label: "Network" },
  { to: "/capture", icon: Camera, label: "Capture" },
  { to: "/schedule", icon: Calendar, label: "Schedule" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="max-w-screen-xl mx-auto flex justify-around items-center h-16 px-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className="flex flex-col items-center justify-center flex-1 py-2 text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <Icon className="h-6 w-6 mb-1" />
            <span className="text-xs">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
