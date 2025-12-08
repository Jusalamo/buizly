import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SplashScreen } from "@/components/SplashScreen";
import Dashboard from "./pages/Dashboard";
import Network from "./pages/Network";
import Capture from "./pages/Capture";
import Schedule from "./pages/Schedule";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ConnectionDetail from "./pages/ConnectionDetail";
import MeetingDetail from "./pages/MeetingDetail";
import MeetingResponse from "./pages/MeetingResponse";
import Connect from "./pages/Connect";
import Contact from "./pages/Contact";
import PublicProfile from "./pages/PublicProfile";
import OAuth2Callback from "./pages/OAuth2Callback";
import Analytics from "./pages/Analytics";
import Subscription from "./pages/Subscription";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/network" element={<Network />} />
      <Route path="/capture" element={<Capture />} />
      <Route path="/schedule" element={<Schedule />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/edit" element={<ProfileEdit />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/connection/:id" element={<ConnectionDetail />} />
      <Route path="/meeting/:id" element={<MeetingDetail />} />
      <Route path="/meeting-response/:id" element={<MeetingResponse />} />
      <Route path="/connect/:id" element={<Connect />} />
      <Route path="/contact/:userId" element={<Contact />} />
      <Route path="/u/:userId" element={<PublicProfile />} />
      <Route path="/oauth2callback" element={<OAuth2Callback />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/subscription" element={<Subscription />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Only show splash on initial app load, not on page refreshes within the app
    const hasSeenSplash = sessionStorage.getItem('buizly_splash_shown');
    if (hasSeenSplash) {
      setShowSplash(false);
    }
    setIsInitialLoad(false);
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('buizly_splash_shown', 'true');
    setShowSplash(false);
  };

  if (isInitialLoad) {
    return null; // Prevent flash while checking session storage
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
