import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Eye, MapPin, Smartphone, Calendar, TrendingUp, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileView {
  id: string;
  profile_id: string;
  viewer_location: string | null;
  viewer_device: string | null;
  viewer_referrer: string | null;
  created_at: string;
}

type TimeRange = "7d" | "30d" | "90d" | "all";

export default function Analytics() {
  const [views, setViews] = useState<ProfileView[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      let query = supabase
        .from("profile_views")
        .select("*")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false });

      if (timeRange !== "all") {
        const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.gte("created_at", startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setViews(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading analytics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getViewsByDay = () => {
    const viewsByDay: Record<string, number> = {};
    views.forEach(view => {
      const day = new Date(view.created_at).toLocaleDateString();
      viewsByDay[day] = (viewsByDay[day] || 0) + 1;
    });
    return Object.entries(viewsByDay).slice(0, 7).reverse();
  };

  const getTopLocations = () => {
    const locations: Record<string, number> = {};
    views.forEach(view => {
      const loc = view.viewer_location || "Unknown";
      locations[loc] = (locations[loc] || 0) + 1;
    });
    return Object.entries(locations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  const getDeviceBreakdown = () => {
    const devices: Record<string, number> = {};
    views.forEach(view => {
      const device = view.viewer_device || "Unknown";
      devices[device] = (devices[device] || 0) + 1;
    });
    return Object.entries(devices)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  };

  const getTopReferrers = () => {
    const referrers: Record<string, number> = {};
    views.forEach(view => {
      const ref = view.viewer_referrer || "Direct";
      referrers[ref] = (referrers[ref] || 0) + 1;
    });
    return Object.entries(referrers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground text-sm">Track who viewed your digital business card</p>
          </div>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[140px] bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{views.length}</p>
                <p className="text-xs text-muted-foreground">Total Views</p>
              </div>
            </div>
          </Card>

          <Card className="bg-card border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {views.filter(v => {
                    const viewDate = new Date(v.created_at);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return viewDate > weekAgo;
                  }).length}
                </p>
                <p className="text-xs text-muted-foreground">This Week</p>
              </div>
            </div>
          </Card>

          <Card className="bg-card border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {new Set(views.map(v => v.viewer_location).filter(Boolean)).size}
                </p>
                <p className="text-xs text-muted-foreground">Locations</p>
              </div>
            </div>
          </Card>

          <Card className="bg-card border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {views.length > 0 ? Math.round(views.length / 30) : 0}
                </p>
                <p className="text-xs text-muted-foreground">Avg/Day</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Views Chart */}
        <Card className="bg-card border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Views Over Time
          </h3>
          {views.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No views yet. Share your QR code to start tracking!</p>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {getViewsByDay().map(([day, count]) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-primary rounded-t-lg transition-all"
                    style={{ height: `${Math.max(10, (count / Math.max(...getViewsByDay().map(d => d[1]))) * 100)}%` }}
                  />
                  <span className="text-xs text-muted-foreground truncate max-w-full">{day.split('/').slice(0, 2).join('/')}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Location & Device Breakdown */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-card border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Top Locations
            </h3>
            {getTopLocations().length === 0 ? (
              <p className="text-muted-foreground text-sm">No location data yet</p>
            ) : (
              <div className="space-y-3">
                {getTopLocations().map(([location, count]) => (
                  <div key={location} className="flex items-center justify-between">
                    <span className="text-foreground text-sm truncate">{location}</span>
                    <span className="text-primary font-medium">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="bg-card border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Devices
            </h3>
            {getDeviceBreakdown().length === 0 ? (
              <p className="text-muted-foreground text-sm">No device data yet</p>
            ) : (
              <div className="space-y-3">
                {getDeviceBreakdown().map(([device, count]) => (
                  <div key={device} className="flex items-center justify-between">
                    <span className="text-foreground text-sm truncate">{device}</span>
                    <span className="text-primary font-medium">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Referrers */}
        <Card className="bg-card border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Traffic Sources
          </h3>
          {getTopReferrers().length === 0 ? (
            <p className="text-muted-foreground text-sm">No referrer data yet</p>
          ) : (
            <div className="space-y-3">
              {getTopReferrers().map(([referrer, count]) => (
                <div key={referrer} className="flex items-center justify-between">
                  <span className="text-foreground text-sm truncate max-w-[80%]">{referrer}</span>
                  <span className="text-primary font-medium">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}