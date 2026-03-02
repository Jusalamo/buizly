import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Flame,
  HandMetal,
  Library,
  MessageCircle,
  CheckCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppCache } from "@/hooks/useAppCache";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { ContactFilters } from "@/components/ContactFilters";

interface ConnectionWithPriority {
  id: string;
  connection_name: string;
  connection_email: string | null;
  connection_phone: string | null;
  connection_title: string | null;
  connection_company: string | null;
  connection_avatar_url: string | null;
  priority: string | null;
  reminder_date: string | null;
  last_contacted_at: string | null;
  archived: boolean | null;
  created_at: string;
  notes: string | null;
}

export default function LeadsDashboard() {
  const { isAuthenticated, initialized } = useAppCache();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<"hot" | "warm" | "library">("hot");
  const [contacts, setContacts] = useState<ConnectionWithPriority[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: "", priority: "all", company: "all", dateRange: "all" });

  useEffect(() => {
    if (initialized && !isAuthenticated) navigate("/auth", { replace: true });
  }, [initialized, isAuthenticated, navigate]);

  useEffect(() => {
    loadContacts();
  }, [isAuthenticated]);

  const loadContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContacts((data as ConnectionWithPriority[]) || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const markContacted = async (id: string) => {
    try {
      const { error } = await supabase
        .from("connections")
        .update({ last_contacted_at: new Date().toISOString(), priority: "warm" })
        .eq("id", id);
      if (error) throw error;
      setContacts((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, last_contacted_at: new Date().toISOString(), priority: "warm" } : c
        )
      );
      toast({ title: "Marked as contacted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Apply filters
  const filtered = useMemo(() => {
    let result = [...contacts].filter((c) => !c.archived);

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.connection_name.toLowerCase().includes(q) ||
          c.connection_company?.toLowerCase().includes(q) ||
          c.notes?.toLowerCase().includes(q)
      );
    }

    if (filters.company !== "all") {
      result = result.filter((c) => c.connection_company === filters.company);
    }

    if (filters.dateRange !== "all") {
      const now = new Date();
      const cutoff = new Date();
      if (filters.dateRange === "week") cutoff.setDate(now.getDate() - 7);
      else if (filters.dateRange === "month") cutoff.setMonth(now.getMonth() - 1);
      else if (filters.dateRange === "year") cutoff.setFullYear(now.getFullYear() - 1);
      result = result.filter((c) => new Date(c.created_at) >= cutoff);
    }

    return result;
  }, [contacts, filters]);

  const hotLeads = filtered.filter((c) => c.priority === "hot");
  const warmContacts = filtered.filter((c) => c.priority === "warm" || !c.priority);
  const companies = [...new Set(contacts.map((c) => c.connection_company).filter(Boolean))] as string[];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leads</h1>
            <p className="text-muted-foreground text-sm">Manage your contacts by priority</p>
          </div>
        </div>

        <ContactFilters
          filters={filters}
          onFiltersChange={setFilters}
          companies={companies}
        />

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3 bg-secondary">
            <TabsTrigger value="hot" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">
              <Flame className="h-4 w-4" />
              Hot
              {hotLeads.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{hotLeads.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="warm" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">
              <HandMetal className="h-4 w-4" />
              Warm
            </TabsTrigger>
            <TabsTrigger value="library" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">
              <Library className="h-4 w-4" />
              Library
            </TabsTrigger>
          </TabsList>

          {/* Hot Leads */}
          <TabsContent value="hot" className="space-y-3 mt-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : hotLeads.length === 0 ? (
              <Card className="bg-card border-border p-8 text-center">
                <Flame className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hot leads right now</p>
              </Card>
            ) : (
              hotLeads.map((c) => (
                <Card key={c.id} className="bg-card border-border border-l-4 border-l-red-500 p-4">
                  <div className="flex items-center gap-3">
                    <OptimizedAvatar
                      src={c.connection_avatar_url}
                      alt={c.connection_name}
                      fallback={c.connection_name.charAt(0)}
                      size="md"
                    />
                    <div className="flex-1 min-w-0" onClick={() => navigate(`/connection/${c.id}`)} role="button">
                      <p className="font-semibold text-foreground">{c.connection_name}</p>
                      {c.connection_company && <p className="text-sm text-muted-foreground">{c.connection_company}</p>}
                    </div>
                    <Button size="sm" onClick={() => markContacted(c.id)} className="gap-1 bg-primary text-primary-foreground">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Contacted
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Warm */}
          <TabsContent value="warm" className="space-y-3 mt-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : warmContacts.length === 0 ? (
              <Card className="bg-card border-border p-8 text-center">
                <HandMetal className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No warm contacts</p>
              </Card>
            ) : (
              warmContacts.map((c) => (
                <Card key={c.id} className="bg-card border-border p-3">
                  <div className="flex items-center gap-3">
                    <OptimizedAvatar
                      src={c.connection_avatar_url}
                      alt={c.connection_name}
                      fallback={c.connection_name.charAt(0)}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0" onClick={() => navigate(`/connection/${c.id}`)} role="button">
                      <p className="font-medium text-foreground text-sm">{c.connection_name}</p>
                      {c.connection_title && <p className="text-xs text-muted-foreground">{c.connection_title}</p>}
                    </div>
                    {c.connection_phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`https://wa.me/${c.connection_phone!.replace(/\D/g, "")}`, "_blank")}
                        className="gap-1"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Message
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Library */}
          <TabsContent value="library" className="space-y-3 mt-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <Card className="bg-card border-border p-8 text-center">
                <Library className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No contacts yet</p>
              </Card>
            ) : (
              filtered.map((c) => (
                <Card
                  key={c.id}
                  className="bg-card border-border p-3 cursor-pointer hover:border-primary/50 transition-all"
                  onClick={() => navigate(`/connection/${c.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <OptimizedAvatar
                      src={c.connection_avatar_url}
                      alt={c.connection_name}
                      fallback={c.connection_name.charAt(0)}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{c.connection_name}</p>
                      {c.connection_company && (
                        <p className="text-xs text-muted-foreground">{c.connection_company}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        c.priority === "hot" ? "text-red-400 border-red-500/40" :
                        c.priority === "cold" ? "text-blue-400 border-blue-500/40" :
                        "text-yellow-400 border-yellow-500/40"
                      }`}
                    >
                      {c.priority || "warm"}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
