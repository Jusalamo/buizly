import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  User, Bell, Database, Settings as SettingsIcon, LogOut, 
  ChevronRight, Calendar, Moon, Sun, Eye, Users, RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserSettings } from "@/hooks/useUserSettings";

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings, loading, updateSettings, refetch } = useUserSettings();
  
  const [darkMode, setDarkMode] = useState(true);
  const [calendarSync, setCalendarSync] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [autoAcceptConnections, setAutoAcceptConnections] = useState(false);
  const [syncing, setSyncing] = useState(false);

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

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your account and preferences</p>
        </div>

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

        {/* Calendar Sync */}
        <Card className="bg-card border-border p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <span className="text-foreground font-medium">Calendar Integration</span>
          </div>
          
          <div className="space-y-4 pl-14">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="calendar-sync" className="text-foreground">Sync to Google Calendar</Label>
                <p className="text-xs text-muted-foreground">Automatically add meetings to your calendar</p>
              </div>
              <Switch
                id="calendar-sync"
                checked={calendarSync}
                onCheckedChange={setCalendarSync}
              />
            </div>
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
                {darkMode ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
                <Label htmlFor="dark-mode" className="text-foreground">Dark Mode</Label>
              </div>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="profile-vis" className="text-foreground">Profile Visibility</Label>
                  <p className="text-xs text-muted-foreground">Allow others to find your profile</p>
                </div>
              </div>
              <Switch
                id="profile-vis"
                checked={profileVisibility}
                onCheckedChange={setProfileVisibility}
              />
            </div>
          </div>
        </Card>

        {/* Connection Settings */}
        <Card className="bg-card border-border p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <span className="text-foreground font-medium">Connection Settings</span>
          </div>
          
          <div className="space-y-4 pl-14">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-accept" className="text-foreground">Auto-accept Connections</Label>
                <p className="text-xs text-muted-foreground">Automatically accept all connection requests</p>
              </div>
              <Switch
                id="auto-accept"
                checked={autoAcceptConnections}
                onCheckedChange={setAutoAcceptConnections}
              />
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
