import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCode } from "@/components/QRCode";
import { Users, Calendar, TrendingUp, MapPin, Clock, ChevronRight, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";
import type { MeetingStatus } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Connection = Database["public"]["Tables"]["connections"]["Row"];
type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & { status?: MeetingStatus };

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  confirmed: "bg-green-500/20 text-green-400",
  declined: "bg-red-500/20 text-red-400",
  cancelled: "bg-muted text-muted-foreground",
  rescheduled: "bg-blue-500/20 text-blue-400"
};

type TimeFilter = "week" | "month" | "year" | "all";

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [allConnections, setAllConnections] = useState<Connection[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [connectionFilter, setConnectionFilter] = useState<TimeFilter>("all");
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterConnections();
  }, [connectionFilter, allConnections]);

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

    // Load all connections
    const { data: connectionsData } = await supabase
      .from("connections")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    setAllConnections(connectionsData || []);

    // Load upcoming meetings
    const today = new Date().toISOString().split('T')[0];
    const { data: meetingsData } = await supabase
      .from("meetings")
      .select("*")
      .eq("user_id", user.id)
      .gte("meeting_date", today)
      .neq("status", "cancelled")
      .order("meeting_date", { ascending: true })
      .limit(5);
    
    setMeetings((meetingsData || []).map(m => ({
      ...m,
      status: (m.status || 'pending') as MeetingStatus
    })));
  };

  const filterConnections = () => {
    const now = new Date();
    let filtered = [...allConnections];
    
    switch (connectionFilter) {
      case "week":
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = allConnections.filter(c => new Date(c.created_at) > weekAgo);
        break;
      case "month":
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = allConnections.filter(c => new Date(c.created_at) > monthAgo);
        break;
      case "year":
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        filtered = allConnections.filter(c => new Date(c.created_at) > yearAgo);
        break;
      default:
        filtered = allConnections;
    }
    
    setConnections(filtered.slice(0, 5));
  };

  const getThisWeekCount = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return allConnections.filter(c => new Date(c.created_at) > weekAgo).length;
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header with QR Code */}
        <div className="flex items-start gap-6">
          {/* Profile Picture & Welcome */}
          <div className="flex items-center gap-4 flex-1">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 border-2 border-primary">
              <span className="text-primary text-2xl font-bold">
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
              </h1>
              <p className="text-muted-foreground text-sm">Here's your networking overview</p>
            </div>
          </div>
          
          {/* QR Code - Prominent on Homepage */}
          <div className="flex-shrink-0">
            <div className="bg-card border border-border rounded-2xl p-3">
              <QRCode 
                url={profile?.qr_code_url || `${window.location.origin}/connect/${profile?.id}`}
                size={120}
                className="rounded-lg"
              />
              <p className="text-xs text-muted-foreground text-center mt-2">Scan to connect</p>
            </div>
          </div>
        </div>

        {/* Stats Grid - Compact Pill Style */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          <Card className="bg-card border-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{allConnections.length}</p>
              <p className="text-xs text-muted-foreground">Connections</p>
            </div>
          </Card>

          <Card className="bg-card border-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{meetings.length}</p>
              <p className="text-xs text-muted-foreground">Upcoming</p>
            </div>
          </Card>

          <Card className="bg-card border-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{getThisWeekCount()}</p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
          </Card>
        </div>

        {/* Upcoming Meetings - Clickable */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Upcoming Meetings</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/schedule")} className="text-primary">
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          {meetings.length === 0 ? (
            <Card className="bg-card border-border p-6 text-center">
              <p className="text-muted-foreground">No upcoming meetings</p>
              <Button onClick={() => navigate("/schedule")} className="mt-4 bg-primary text-primary-foreground">
                Schedule a Meeting
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <Card
                  key={meeting.id}
                  className="bg-card border-border p-4 cursor-pointer hover:bg-card/80 hover:border-primary/50 transition-all"
                  onClick={() => navigate(`/meeting/${meeting.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-foreground">
                          {meeting.title || "Meeting"}
                        </p>
                        <Badge className={`${statusColors[meeting.status || 'pending']} border-0 text-xs`}>
                          {meeting.status || 'pending'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(meeting.meeting_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{meeting.meeting_time}</span>
                        </div>
                        {meeting.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{meeting.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent Connections with Filters */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Connections</h2>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={connectionFilter} onValueChange={(v) => setConnectionFilter(v as TimeFilter)}>
                <SelectTrigger className="w-[120px] h-8 bg-secondary border-border text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Past Week</SelectItem>
                  <SelectItem value="month">Past Month</SelectItem>
                  <SelectItem value="year">Past Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {connections.length === 0 ? (
            <Card className="bg-card border-border p-6 text-center">
              <p className="text-muted-foreground">
                {connectionFilter !== "all" ? "No connections in this period" : "No connections yet"}
              </p>
              <Button onClick={() => navigate("/capture")} className="mt-4 bg-primary text-primary-foreground">
                Add Connection
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {connections.map((connection) => (
                <Card
                  key={connection.id}
                  className="bg-card border-border p-4 cursor-pointer hover:bg-card/80 hover:border-primary/50 transition-all"
                  onClick={() => navigate(`/connection/${connection.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-medium">
                        {connection.connection_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{connection.connection_name}</p>
                      {connection.connection_title && (
                        <p className="text-sm text-muted-foreground truncate">{connection.connection_title}</p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
