import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, Bell, Database, Settings as SettingsIcon, LogOut, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const settingsItems = [
  { icon: User, label: "Profile Management", action: "profile" },
  { icon: Bell, label: "Notification Settings", action: "notifications" },
  { icon: Database, label: "Data Sync", action: "sync" },
  { icon: SettingsIcon, label: "App Preferences", action: "preferences" },
];

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const handleItemClick = (action: string) => {
    if (action === "profile") {
      navigate("/profile");
    } else {
      toast({
        title: "Coming soon",
        description: "This feature will be available in a future update",
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <div className="space-y-3">
          {settingsItems.map(({ icon: Icon, label, action }) => (
            <Card
              key={action}
              className="bg-card border-border p-4 cursor-pointer hover:bg-card/80 transition-colors"
              onClick={() => handleItemClick(action)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-foreground font-medium">{label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>

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
