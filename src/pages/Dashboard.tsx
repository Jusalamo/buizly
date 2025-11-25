import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Users, Calendar, TrendingUp } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Connection = Database["public"]["Tables"]["connections"]["Row"];
type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // Load profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    setProfile(profileData);

    // Load connections
    const { data: connectionsData } = await supabase
      .from("connections")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    
    setConnections(connectionsData || []);

    // Load upcoming meetings
    const today = new Date().toISOString().split('T')[0];
    const { data: meetingsData } = await supabase
      .from("meetings")
      .select("*")
      .eq("user_id", user.id)
      .gte("meeting_date", today)
      .order("meeting_date", { ascending: true })
      .limit(5);
    
    setMeetings(meetingsData || []);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-muted-foreground mt-2">Here's your networking overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{connections.length}</p>
                <p className="text-sm text-muted-foreground">Total Connections</p>
              </div>
            </div>
          </Card>

          <Card className="bg-card border-border p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{meetings.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming Meetings</p>
              </div>
            </div>
          </Card>

          <Card className="bg-card border-border p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {connections.filter(c => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return new Date(c.created_at) > weekAgo;
                  }).length}
                </p>
                <p className="text-sm text-muted-foreground">This Week</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Upcoming Meetings */}
        {meetings.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Upcoming Meetings</h2>
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <Card
                  key={meeting.id}
                  className="bg-card border-primary/20 p-4 cursor-pointer hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Meeting</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(meeting.meeting_date).toLocaleDateString()} at {meeting.meeting_time}
                      </p>
                    </div>
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent Connections */}
        {connections.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Recent Connections</h2>
            <div className="space-y-3">
              {connections.map((connection) => (
                <Card
                  key={connection.id}
                  className="bg-card border-border p-4 cursor-pointer hover:bg-card/80 transition-colors"
                  onClick={() => navigate(`/connection/${connection.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-primary font-medium">
                        {connection.connection_name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{connection.connection_name}</p>
                      {connection.connection_title && (
                        <p className="text-sm text-muted-foreground">{connection.connection_title}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
