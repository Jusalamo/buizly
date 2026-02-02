import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCode } from "@/components/QRCode";
import { 
  Users, Calendar, StickyNote, QrCode, MapPin, Clock, ChevronRight, Filter, UserPlus, 
  Video, ExternalLink, FileText, CalendarDays 
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConnectionRequests } from "@/hooks/useConnectionRequests";
import { useAppCache } from "@/hooks/useAppCache";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useUserSettings } from "@/hooks/useUserSettings";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { ProfileOnboarding } from "@/components/ProfileOnboarding";
import { supabase } from "@/integrations/supabase/client";
import type { MeetingStatus } from "@/types/database";
import { format, isToday, parseISO } from "date-fns";

// Use semantic status color tokens
const statusColors: Record<string, string> = {
  pending: "bg-status-warning/20 text-status-warning",
  confirmed: "bg-status-success/20 text-status-success",
  declined: "bg-status-error/20 text-status-error",
  cancelled: "bg-muted text-muted-foreground",
  rescheduled: "bg-status-info/20 text-status-info"
};

type TimeFilter = "week" | "month" | "year" | "all";

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  meeting_link?: string;
  has_notes?: boolean;
  meeting_notes_id?: string;
  status?: string;
}

// Helper to detect if a string is a meeting URL
function isMeetingUrl(location: string | undefined): boolean {
  if (!location) return false;
  const meetingPatterns = [
    /zoom\.us/i,
    /meet\.google\.com/i,
    /teams\.microsoft\.com/i,
    /webex\.com/i,
    /gotomeeting\.com/i,
    /whereby\.com/i,
  ];
  return meetingPatterns.some(pattern => pattern.test(location));
}

// Helper to open location (meeting link or Google Maps)
function openLocation(location: string | undefined, meetingLink: string | undefined) {
  // Prioritize meeting link if available
  if (meetingLink) {
    window.open(meetingLink, '_blank');
    return;
  }
  
  if (!location) return;
  
  // Check if it's a meeting URL
  if (isMeetingUrl(location)) {
    // Ensure it has a protocol
    const url = location.startsWith('http') ? location : `https://${location}`;
    window.open(url, '_blank');
  } else {
    // Open in Google Maps
    const encoded = encodeURIComponent(location);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
  }
}

export default function Dashboard() {
  const [connectionFilter, setConnectionFilter] = useState<TimeFilter>("all");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const navigate = useNavigate();
  const { incomingRequests, refetch: refetchRequests } = useConnectionRequests();
  const { profile, connections: allConnections, meetings: allMeetings, loading, isAuthenticated, initialized, refetch } = useAppCache();
  const { settings, loading: settingsLoading } = useUserSettings();

  // Fetch today's calendar events
  useEffect(() => {
    async function fetchTodayEvents() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const { data, error } = await supabase
          .from('calendar_events')
          .select('id, title, start_time, end_time, location, meeting_link, has_notes, meeting_notes_id, status')
          .eq('user_id', user.id)
          .gte('start_time', startOfDay)
          .lte('start_time', endOfDay)
          .neq('status', 'cancelled')
          .order('start_time', { ascending: true });

        if (error) throw error;
        setTodayEvents(data || []);
      } catch (error) {
        console.error('Error fetching today events:', error);
      } finally {
        setLoadingEvents(false);
      }
    }

    if (isAuthenticated) {
      fetchTodayEvents();
    }
  }, [isAuthenticated]);

  // Set up realtime subscription
  useRealtimeSubscription({
    onNotification: () => refetch(),
    onConnection: () => refetch(),
    onMeeting: () => refetch(),
    onConnectionRequest: () => refetchRequests()
  });

  // Redirect to auth if not authenticated (after cache is initialized)
  useEffect(() => {
    if (initialized && !isAuthenticated && !profile) {
      navigate("/auth", { replace: true });
    }
  }, [initialized, isAuthenticated, profile, navigate]);

  // Check if onboarding is needed
  useEffect(() => {
    if (settings && !settings.onboarding_completed && isAuthenticated) {
      setShowOnboarding(true);
    }
  }, [settings, isAuthenticated]);

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

  // Show minimal loading only on first load before auth check
  if (!initialized) {
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

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated && !profile) {
    return null;
  }

  // Show onboarding if needed
  if (showOnboarding) {
    return (
      <ProfileOnboarding 
        onComplete={() => {
          setShowOnboarding(false);
          refetch();
        }} 
      />
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
              url={`https://buizly.vercel.app/u/${profile?.id}`}
              size={140}
              className="rounded-lg"
            />
            <p className="text-xs text-muted-foreground text-center mt-3 font-medium">Scan to view my card</p>
          </div>
          
          <div className="flex items-center gap-4">
            <OptimizedAvatar
              src={profile?.avatar_url}
              alt={profile?.full_name || "User"}
              fallback={profile?.full_name?.charAt(0) || "U"}
              size="lg"
              className="border-2 border-primary"
            />
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">
                Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
              </h1>
              <p className="text-muted-foreground text-sm">Here's your networking overview</p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons - Horizontal on mobile */}
        <div className="flex flex-row gap-3 overflow-x-auto pb-2">
          {/* Notes Button */}
          <Button 
            onClick={() => navigate("/notes")}
            className="flex-1 min-w-0 h-auto py-4 px-4 bg-card hover:bg-card/80 border border-border text-foreground flex flex-col items-center gap-2"
            variant="outline"
          >
            <div className="p-2 bg-primary/10 rounded-lg">
              <StickyNote className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium">Notes</span>
          </Button>

          {/* Quick Scan Button */}
          <Button 
            onClick={() => navigate("/capture?scan=true")}
            className="flex-1 min-w-0 h-auto py-4 px-4 bg-card hover:bg-card/80 border border-border text-foreground flex flex-col items-center gap-2"
            variant="outline"
          >
            <div className="p-2 bg-primary/10 rounded-lg">
              <QrCode className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium">Quick Scan</span>
          </Button>

          {/* Calendar Button - Replaces Check-in */}
          <Button 
            onClick={() => navigate("/calendar")}
            className="flex-1 min-w-0 h-auto py-4 px-4 bg-card hover:bg-card/80 border border-border text-foreground flex flex-col items-center gap-2"
            variant="outline"
          >
            <div className="p-2 bg-primary/10 rounded-lg">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium">Calendar</span>
          </Button>
        </div>

        {/* Today's Agenda */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Today's Agenda</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/calendar")} className="text-primary">
              View Calendar <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          {loadingEvents ? (
            <Card className="bg-card border-border p-6">
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-secondary rounded w-3/4" />
                <div className="h-4 bg-secondary rounded w-1/2" />
              </div>
            </Card>
          ) : todayEvents.length === 0 ? (
            <Card className="bg-card border-border p-6 text-center">
              <p className="text-muted-foreground">No events scheduled for today</p>
              <Button onClick={() => navigate("/calendar")} className="mt-4 bg-primary text-primary-foreground">
                Schedule an Event
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {todayEvents.map((event) => {
                const isVirtual = isMeetingUrl(event.location) || !!event.meeting_link;
                const startTime = format(parseISO(event.start_time), 'h:mm a');
                const endTime = format(parseISO(event.end_time), 'h:mm a');
                
                return (
                  <Card
                    key={event.id}
                    className="bg-card border-border p-4 hover:bg-card/80 hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-foreground">
                            {event.title || "Untitled Event"}
                          </p>
                          {event.has_notes && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/notes?note=${event.meeting_notes_id}`);
                              }}
                              title="View Notes"
                            >
                              <FileText className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{startTime} - {endTime}</span>
                          </div>
                          {(event.location || event.meeting_link) && (
                            <button 
                              onClick={() => openLocation(event.location, event.meeting_link)}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              {isVirtual ? (
                                <>
                                  <Video className="h-3 w-3" />
                                  <span>Join Meeting</span>
                                  <ExternalLink className="h-3 w-3" />
                                </>
                              ) : (
                                <>
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate max-w-[120px]">{event.location}</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      {!event.has_notes && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/notes?event=${event.id}`)}
                          className="text-xs"
                        >
                          <StickyNote className="h-3 w-3 mr-1" />
                          Add Notes
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
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
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openLocation(meeting.location, undefined);
                            }}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            {isMeetingUrl(meeting.location) ? (
                              <>
                                <Video className="h-3 w-3" />
                                <span>Join</span>
                              </>
                            ) : (
                              <>
                                <MapPin className="h-3 w-3" />
                                <span className="truncate max-w-[100px]">{meeting.location}</span>
                              </>
                            )}
                          </button>
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
                    <OptimizedAvatar
                      src={(connection as any).connection_avatar_url}
                      alt={connection.connection_name}
                      fallback={connection.connection_name.charAt(0)}
                      size="md"
                    />
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
