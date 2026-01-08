import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Trash2, MoreVertical, Calendar, Tag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { ConnectionLimitBadge } from "@/components/ConnectionLimitBadge";
import { useAppCache, invalidateAppCache } from "@/hooks/useAppCache";

type DateFilter = "all" | "week" | "month" | "year";

export default function Network() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canAddConnection, getCurrentPlan } = useSubscription();
  const { connections, loading, isAuthenticated, initialized } = useAppCache();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (initialized && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [initialized, isAuthenticated, navigate]);

  const handleAddConnection = () => {
    if (!canAddConnection()) {
      setShowUpgrade(true);
      return;
    }
    navigate("/capture");
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      // First, clear parent_meeting_id references for meetings linked to this connection
      const { data: meetings } = await supabase
        .from("meetings")
        .select("id")
        .eq("connection_id", deleteId);

      if (meetings && meetings.length > 0) {
        const meetingIds = meetings.map(m => m.id);
        
        // Clear parent_meeting_id for any meetings that reference these meetings
        await supabase
          .from("meetings")
          .update({ parent_meeting_id: null })
          .in("parent_meeting_id", meetingIds);
        
        // Delete meeting participants
        for (const meetingId of meetingIds) {
          await supabase
            .from("meeting_participants")
            .delete()
            .eq("meeting_id", meetingId);
          
          await supabase
            .from("meeting_notes")
            .delete()
            .eq("meeting_id", meetingId);
        }
        
        // Delete meetings for this connection
        await supabase
          .from("meetings")
          .delete()
          .eq("connection_id", deleteId);
      }

      // Now delete the connection
      const { error } = await supabase
        .from("connections")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      // Refresh the cache
      invalidateAppCache();
      
      toast({
        title: "Connection removed",
        description: "The connection and related meetings have been deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete connection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  // Get unique companies for filter
  const companies = useMemo(() => {
    const companySet = new Set<string>();
    connections.forEach(c => {
      if (c.connection_company) {
        companySet.add(c.connection_company);
      }
    });
    return Array.from(companySet).sort();
  }, [connections]);

  // Filter connections
  const filteredConnections = useMemo(() => {
    let filtered = [...connections];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.connection_name.toLowerCase().includes(query) ||
        c.connection_email?.toLowerCase().includes(query) ||
        c.connection_company?.toLowerCase().includes(query) ||
        c.connection_title?.toLowerCase().includes(query)
      );
    }

    // Date filter
    const now = new Date();
    switch (dateFilter) {
      case "week":
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(c => new Date(c.created_at) > weekAgo);
        break;
      case "month":
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(c => new Date(c.created_at) > monthAgo);
        break;
      case "year":
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(c => new Date(c.created_at) > yearAgo);
        break;
    }

    // Company filter
    if (companyFilter !== "all") {
      filtered = filtered.filter(c => c.connection_company === companyFilter);
    }

    return filtered;
  }, [connections, searchQuery, dateFilter, companyFilter]);

  const isFree = getCurrentPlan() === "free";

  // Only show minimal loading on first load with no data
  if (loading && connections.length === 0) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6 space-y-6 animate-pulse">
          <div className="h-8 w-32 bg-secondary rounded" />
          <div className="h-10 bg-secondary rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-secondary rounded-lg" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Network</h1>
            <p className="text-muted-foreground text-sm">Manage your professional connections</p>
          </div>
          {isFree && <ConnectionLimitBadge />}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, email, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary border-border text-foreground"
          />
        </div>

        {/* Filters - Compact Pill Style */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-secondary rounded-full px-3 py-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-[100px] h-7 border-0 bg-transparent p-0 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
                <SelectItem value="year">Past Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {companies.length > 0 && (
            <div className="flex items-center gap-2 bg-secondary rounded-full px-3 py-1.5">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-[120px] h-7 border-0 bg-transparent p-0 text-sm">
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map(company => (
                    <SelectItem key={company} value={company}>{company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(dateFilter !== "all" || companyFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFilter("all");
                setCompanyFilter("all");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{filteredConnections.length} connections</span>
          {filteredConnections.length !== connections.length && (
            <span className="text-primary">({connections.length} total)</span>
          )}
        </div>

        {/* Connections List */}
        <div className="space-y-3">
          {filteredConnections.length === 0 ? (
            <Card className="bg-card border-border p-8 text-center">
              <p className="text-muted-foreground">
                {searchQuery || dateFilter !== "all" || companyFilter !== "all"
                  ? "No connections found with current filters"
                  : "No connections yet. Start by capturing a new meeting!"}
              </p>
              {!searchQuery && dateFilter === "all" && companyFilter === "all" && (
                <Button onClick={handleAddConnection} className="mt-4 bg-primary text-primary-foreground">
                  Add Connection
                </Button>
              )}
            </Card>
          ) : (
            filteredConnections.map((connection) => (
              <Card
                key={connection.id}
                className="bg-card border-border p-4 hover:bg-card/80 hover:border-primary/50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="flex-1 flex items-center gap-4 cursor-pointer"
                    onClick={() => navigate(`/connection/${connection.id}`)}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary text-lg font-bold">
                        {connection.connection_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{connection.connection_name}</p>
                      {connection.connection_title && (
                        <p className="text-sm text-primary">{connection.connection_title}</p>
                      )}
                      {connection.connection_company && (
                        <p className="text-sm text-muted-foreground">{connection.connection_company}</p>
                      )}
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/connection/${connection.id}`)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/schedule?connection=${connection.id}`)}>
                        Schedule Meeting
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteId(connection.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this connection? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UpgradePrompt 
        open={showUpgrade} 
        onOpenChange={setShowUpgrade}
        feature="connections"
      />
    </Layout>
  );
}
