import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCode } from "@/components/QRCode";
import { Users, Calendar, TrendingUp, MapPin, Clock, ChevronRight, Filter, UserPlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConnectionRequests } from "@/hooks/useConnectionRequests";
import { useAppCache } from "@/hooks/useAppCache";
import type { MeetingStatus } from "@/types/database";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  confirmed: "bg-green-500/20 text-green-400",
  declined: "bg-red-500/20 text-red-400",
  cancelled: "bg-muted text-muted-foreground",
  rescheduled: "bg-blue-500/20 text-blue-400"
};

type TimeFilter = "week" | "month" | "year" | "all";

export default function Dashboard() {
  const [connectionFilter, setConnectionFilter] = useState<TimeFilter>("all");
  const navigate = useNavigate();
  const { incomingRequests } = useConnectionRequests();
  const { profile, connections: allConnections, meetings: allMeetings, loading } = useAppCache();

  // Filter upcoming meetings (not cancelled, future dates)
  const upcomingMeetings = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return allMeetings
      .filter(m => m.meeting_date >= today && m.status !== 'cancelled')
      .slice(0, 5)
      .map(m => ({
        ...m,
        status: (m.status || 'pending') as MeetingStatus
      }));
  }, [allMeetings]);

  // Filter connections based on time filter
  const filteredConnections = useMemo(() => {
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
    
    return filtered.slice(0, 5);
  }, [allConnections, connectionFilter]);

  const getThisWeekCount = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return allConnections.filter(c => new Date(c.created_at) > weekAgo).length;
  }, [allConnections]);

  // Immediate render with cached data - no skeleton on tab switch
  // Only show minimal loading state on first ever load
  if (loading && !profile) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6 space-y-6 animate-pulse">
          <div className="flex flex-col items-center space-y-6">
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="w-[140px] h-[140px] bg-secondary rounded-lg" />
            </div>
            <div className="h-8 w-48 bg-secondary rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Connection Requests Banner */}
        {incomingRequests.length > 0 && (
          <Card className="bg-primary/10 border-primary/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-full">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {incomingRequests.length} connection request{incomingRequests.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">People want to connect with you</p>
                </div>
              </div>
              <Button onClick={() => navigate("/discover")} size="sm" className="bg-primary text-primary-foreground">
                View
              </Button>
            </div>
          </Card>
        )}

        {/* QR Code - Centered above Welcome */}
        <div className="flex flex-col items-center space-y-6">
          <div className="bg-card border border-border rounded-2xl p-4">
            <QRCode 
              url={`${window.location.origin}/u/${profile?.id}`}
              size={140}
              className="rounded-lg"
            />
            <p className="text-xs text-muted-foreground text-center mt-3 font-medium">Scan to view my card</p>
          </div>
          
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.full_name}
                className="w-16 h-16 rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
                <span className="text-primary text-2xl font-bold">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">
                Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
              </h1>
              <p className="text-muted-foreground text-sm">Here's your networking overview</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="bg-card border-border px-4 py-3 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{allConnections.length}</p>
              <p className="text-xs text-muted-foreground">Connections</p>
            </div>
          </Card>

          <Card className="bg-card border-border px-4 py-3 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{upcomingMeetings.length}</p>
              <p className="text-xs text-muted-foreground">Upcoming</p>
            </div>
          </Card>

          <Card className="bg-card border-border px-4 py-3 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{getThisWeekCount}</p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
          </Card>
        </div>

        {/* Upcoming Meetings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Upcoming Meetings</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/schedule")} className="text-primary">
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          {upcomingMeetings.length === 0 ? (
            <Card className="bg-card border-border p-6 text-center">
              <p className="text-muted-foreground">No upcoming meetings</p>
              <Button onClick={() => navigate("/schedule")} className="mt-4 bg-primary text-primary-foreground">
                Schedule a Meeting
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingMeetings.map((meeting) => (
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

        {/* Recent Connections */}
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
          
          {filteredConnections.length === 0 ? (
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
              {filteredConnections.map((connection) => (
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
