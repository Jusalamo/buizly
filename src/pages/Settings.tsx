import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, Bell, Database, Settings as SettingsIcon, LogOut, 
  ChevronRight, Calendar, Moon, Sun, Eye, RefreshCw, BarChart3, Linkedin, Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useTheme } from "@/contexts/ThemeContext";
import { LinkedInImport } from "@/components/LinkedInImport";
import { CalendarSync } from "@/components/CalendarSync";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings, loading, updateSettings, refetch } = useUserSettings();
  const { theme, setTheme } = useTheme();
  
  const [calendarSync, setCalendarSync] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState("public");
  const [syncing, setSyncing] = useState(false);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);

  useEffect(() => {
    if (settings?.profile_visibility) {
      setProfileVisibility(settings.profile_visibility);
    }
  }, [settings]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    // Simulate sync
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSyncing(false);
    toast({
      title: "Sync complete",
      description: "Your data has been synchronized",
    });
  };

  const handleNotificationToggle = async (type: 'email' | 'push', value: boolean) => {
    try {
      if (type === 'email') {
        await updateSettings({ email_notifications: value });
      } else {
        await updateSettings({ push_notifications: value });
      }
      toast({
        title: "Settings updated",
        description: `${type === 'email' ? 'Email' : 'Push'} notifications ${value ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    }
  };

  const handleProfileVisibilityChange = async (value: string) => {
    try {
      await updateSettings({ profile_visibility: value });
      setProfileVisibility(value);
      toast({
        title: "Profile visibility updated",
        description: `Your profile is now ${value}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile visibility",
        variant: "destructive",
      });
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      const redirectUri = `${window.location.origin}/oauth2callback`;
      
      const { data, error } = await supabase.functions.invoke('google-auth-start', {
        body: { redirectUri }
      });

      if (error) throw error;

      // Open Google OAuth in new window
      window.location.href = data.authUrl;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const disconnectGoogleCalendar = async () => {
    setDisconnectingGoogle(true);
    try {
      const { error } = await supabase.functions.invoke('google-revoke');
      if (error) throw error;

      await refetch();
      toast({
        title: "Disconnected",
        description: "Google Calendar has been disconnected",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDisconnectingGoogle(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your account and preferences</p>
        </div>

        {/* Analytics */}
        <Card
          className="bg-card border-border p-4 cursor-pointer hover:bg-card/80 transition-colors"
          onClick={() => navigate("/analytics")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="text-foreground font-medium">Analytics</span>
                <p className="text-sm text-muted-foreground">Track who viewed your card</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        {/* Subscription */}
        <Card
          className="bg-card border-border p-4 cursor-pointer hover:bg-card/80 transition-colors"
          onClick={() => navigate("/subscription")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="text-foreground font-medium">Subscription</span>
                <p className="text-sm text-muted-foreground">Manage your plan and billing</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        {/* Profile Management */}
        <Card
          className="bg-card border-border p-4 cursor-pointer hover:bg-card/80 transition-colors"
          onClick={() => navigate("/profile")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="text-foreground font-medium">Profile Management</span>
                <p className="text-sm text-muted-foreground">View and edit your profile</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="bg-card border-border p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <span className="text-foreground font-medium">Notification Settings</span>
          </div>
          
          <div className="space-y-4 pl-14">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notif" className="text-foreground">Email Notifications</Label>
              <Switch
                id="email-notif"
                checked={settings?.email_notifications ?? true}
                onCheckedChange={(v) => handleNotificationToggle('email', v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notif" className="text-foreground">Push Notifications</Label>
              <Switch
                id="push-notif"
                checked={settings?.push_notifications ?? true}
                onCheckedChange={(v) => handleNotificationToggle('push', v)}
              />
            </div>
          </div>
        </Card>

        {/* Calendar Integrations */}
        <Card className="bg-card border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="text-foreground font-medium">Calendar Sync</span>
                <p className="text-xs text-muted-foreground mt-1">
                  {settings?.google_calendar_connected 
                    ? "Google Calendar connected" 
                    : "Sync meetings with your calendar"}
                </p>
              </div>
            </div>
            <CalendarSync 
              googleConnected={settings?.google_calendar_connected}
              outlookConnected={settings?.outlook_calendar_connected}
              icalUrl={settings?.ical_url || undefined}
              onSync={refetch}
            />
          </div>
        </Card>

        {/* LinkedIn Integration */}
        <Card className="bg-card border-border p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2 bg-[#0077B5]/10 rounded-lg">
              <Linkedin className="h-5 w-5 text-[#0077B5]" />
            </div>
            <div className="flex-1">
              <span className="text-foreground font-medium">LinkedIn</span>
              <p className="text-xs text-muted-foreground mt-1">
                Link your LinkedIn profile to your business card
              </p>
            </div>
          </div>
          
          <div className="pl-14">
            <LinkedInImport />
          </div>
        </Card>

        {/* Data Sync */}
        <Card className="bg-card border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="text-foreground font-medium">Data Sync</span>
                <p className="text-sm text-muted-foreground">Sync your data across devices</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="border-primary text-primary"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </Card>

        {/* App Preferences */}
        <Card className="bg-card border-border p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <SettingsIcon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-foreground font-medium">App Preferences</span>
          </div>
          
          <div className="space-y-4 pl-14">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {theme === 'dark' ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
                <div>
                  <Label htmlFor="theme" className="text-foreground">Theme</Label>
                  <p className="text-xs text-muted-foreground">Choose your preferred theme</p>
                </div>
              </div>
              <Select value={theme} onValueChange={(value: any) => setTheme(value)}>
                <SelectTrigger className="w-32 bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="profile-vis" className="text-foreground">Profile Visibility</Label>
                  <p className="text-xs text-muted-foreground">Control who can see your profile</p>
                </div>
              </div>
              <Select value={profileVisibility} onValueChange={handleProfileVisibilityChange}>
                <SelectTrigger className="w-32 bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="connections">Connections</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>


        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          variant="destructive"
          className="w-full mt-8"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </Layout>
  );
}
