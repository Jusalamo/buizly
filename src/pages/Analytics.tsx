import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Eye, MapPin, Smartphone, Calendar, TrendingUp, Globe, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

  const getChartData = () => {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365;
    const data: { date: string; views: number; fullDate: string }[] = [];
    
    // Create array of dates for the range
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const viewsCount = views.filter(v => {
        const viewDate = new Date(v.created_at).toISOString().split('T')[0];
        return viewDate === dateStr;
      }).length;
      
      data.push({ 
        date: displayDate, 
        views: viewsCount,
        fullDate: dateStr
      });
    }
    
    // For longer ranges, sample the data to avoid overcrowding
    if (days > 30) {
      const sampleRate = Math.ceil(days / 30);
      return data.filter((_, index) => index % sampleRate === 0 || index === data.length - 1);
    }
    
    return data;
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

  const getAvgPerDay = () => {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365;
    return views.length > 0 ? (views.length / days).toFixed(1) : "0";
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner size="md" />
        </div>
      </Layout>
    );
  }

  const chartData = getChartData();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/settings")}
          className="text-foreground hover:text-primary -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Settings
        </Button>

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
                <p className="text-2xl font-bold text-foreground">{getAvgPerDay()}</p>
                <p className="text-xs text-muted-foreground">Avg/Day</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Views Chart - Real Graph */}
        <Card className="bg-card border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Views Over Time
          </h3>
          {views.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No views yet. Share your QR code to start tracking!</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`${value} views`, 'Views']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="views" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorViews)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
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
