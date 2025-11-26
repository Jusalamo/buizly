import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { NotificationBell } from "./NotificationBell";
import { SearchDialog } from "./SearchDialog";
import { OnboardingTour } from "./OnboardingTour";

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
  title?: string;
}

export const Layout = ({ children, showNav = true, title }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-lg text-foreground">
            {title || "Buizly"}
          </h1>
          <div className="flex items-center gap-1">
            <SearchDialog />
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className={showNav ? "pb-20" : ""}>
        {children}
      </main>
      
      {showNav && <BottomNav />}
      <OnboardingTour />
    </div>
  );
};
