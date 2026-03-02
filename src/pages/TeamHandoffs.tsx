import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Send,
  Inbox,
  Flame,
  HandMetal,
  Archive,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppCache } from "@/hooks/useAppCache";

const STATUS_OPTIONS = ["pending", "contacted", "deal_closed", "lost"] as const;

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-yellow-500/20 text-yellow-400", icon: <Clock className="h-3 w-3" /> },
  contacted: { label: "Contacted", color: "bg-blue-500/20 text-blue-400", icon: <Send className="h-3 w-3" /> },
  deal_closed: { label: "Deal Closed", color: "bg-green-500/20 text-green-400", icon: <CheckCircle className="h-3 w-3" /> },
  lost: { label: "Lost", color: "bg-red-500/20 text-red-400", icon: <XCircle className="h-3 w-3" /> },
};

const priorityConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  hot: { icon: <Flame className="h-3 w-3" />, color: "text-red-400" },
  warm: { icon: <HandMetal className="h-3 w-3" />, color: "text-yellow-400" },
  cold: { icon: <Archive className="h-3 w-3" />, color: "text-blue-400" },
};

interface Handoff {
  id: string;
  from_user: string;
  to_user: string;
  contact_name: string;
  contact_company: string | null;
  note: string | null;
  priority: string;
  status: string;
  card_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function TeamHandoffs() {
  const { isAuthenticated, initialized } = useAppCache();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialized && !isAuthenticated) navigate("/auth", { replace: true });
  }, [initialized, isAuthenticated, navigate]);

  useEffect(() => {
    loadHandoffs();
  }, [isAuthenticated]);

  const loadHandoffs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("handoffs")
        .select("*")
        .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHandoffs((data as Handoff[]) || []);

      // Fetch profile names
      const userIds = [...new Set((data || []).flatMap((h: Handoff) => [h.from_user, h.to_user]))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        const map: Record<string, string> = {};
        profiles?.forEach((p) => { map[p.id] = p.full_name; });
        setProfileMap(map);
      }
    } catch (err) {
      console.error("Error loading handoffs:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (handoffId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("handoffs")
        .update({ status: newStatus })
        .eq("id", handoffId);
      if (error) throw error;
      setHandoffs((prev) => prev.map((h) => h.id === handoffId ? { ...h, status: newStatus } : h));
      toast({ title: "Status updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const renderHandoffCard = (handoff: Handoff, type: "received" | "sent") => {
    const pri = priorityConfig[handoff.priority] || priorityConfig.warm;
    const stat = statusConfig[handoff.status] || statusConfig.pending;

    return (
      <Card key={handoff.id} className="bg-card border-border p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={pri.color}>{pri.icon}</span>
              <h3 className="font-semibold text-foreground">{handoff.contact_name}</h3>
            </div>
            {handoff.contact_company && (
              <p className="text-sm text-muted-foreground">{handoff.contact_company}</p>
            )}
          </div>
          <Badge className={`${stat.color} border-0 gap-1 text-xs`}>
            {stat.icon}
            {stat.label}
          </Badge>
        </div>

        {handoff.note && (
          <p className="text-sm text-muted-foreground italic">"{handoff.note}"</p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {type === "received" ? "From" : "To"}:{" "}
            {profileMap[type === "received" ? handoff.from_user : handoff.to_user] || "Unknown"}
          </span>
          <span>{new Date(handoff.created_at).toLocaleDateString()}</span>
        </div>

        {type === "received" && (
          <Select
            value={handoff.status}
            onValueChange={(v) => updateStatus(handoff.id, v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusConfig[s]?.label || s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Card>
    );
  };

  const getUserId = () => {
    // We need the current user id to split handoffs
    const received = handoffs.filter((h) => {
      // Find current user from any handoff
      return true;
    });
    return null;
  };

  // Split by current user
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
  }, []);

  const received = handoffs.filter((h) => h.to_user === currentUserId);
  const sent = handoffs.filter((h) => h.from_user === currentUserId);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Team Handoffs</h1>
            <p className="text-muted-foreground text-sm">Track assigned contacts</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "received" | "sent")}>
          <TabsList className="grid w-full grid-cols-2 bg-secondary">
            <TabsTrigger value="received" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
              <Inbox className="h-4 w-4" />
              Assigned to Me
              {received.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{received.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
              <Send className="h-4 w-4" />
              Assigned by Me
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="space-y-3 mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : received.length === 0 ? (
              <Card className="bg-card border-border p-8 text-center">
                <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No handoffs assigned to you</p>
              </Card>
            ) : (
              received.map((h) => renderHandoffCard(h, "received"))
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-3 mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sent.length === 0 ? (
              <Card className="bg-card border-border p-8 text-center">
                <Send className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">You haven't assigned any contacts yet</p>
              </Card>
            ) : (
              sent.map((h) => renderHandoffCard(h, "sent"))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
