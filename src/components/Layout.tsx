import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export const Layout = ({ children, showNav = true }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className={showNav ? "pb-20" : ""}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
};
