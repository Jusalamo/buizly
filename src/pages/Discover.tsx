import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, UserPlus, Users, Building, Mail, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Connection = Database["public"]["Tables"]["connections"]["Row"];

interface ConnectionRequest {
  id: string;
  requester_id: string;
  target_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  requester?: Profile;
  target?: Profile;
}

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "manual">("search");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Manual add form
  const [manualForm, setManualForm] = useState({
    name: "",
    email: "",
    phone: "",
    title: "",
    company: "",
    notes: ""
  });
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    loadExistingConnections();
    loadConnectionRequests();
  }, []);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchProfiles();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const loadExistingConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("connections")
      .select("*")
      .eq("user_id", user.id);

    setConnections(data || []);
  };

  const loadConnectionRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // For now, we'll store connection status in a simple way
    // In a full implementation, you'd have a connection_requests table
  };

  const searchProfiles = async () => {
    setSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const query = searchQuery.toLowerCase();
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id) // Exclude self
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%,job_title.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleSendConnectionRequest = async (targetProfile: Profile) => {
    setSendingRequest(targetProfile.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if already connected
      const isConnected = connections.some(
        c => c.connection_email === targetProfile.email
      );

      if (isConnected) {
        toast({
          title: "Already connected",
          description: `You're already connected with ${targetProfile.full_name}`,
        });
        return;
      }

      // Add as connection (in a real app, this would be a pending request)
      const { error } = await supabase
        .from("connections")
        .insert({
          user_id: user.id,
          connection_name: targetProfile.full_name,
          connection_email: targetProfile.email,
          connection_title: targetProfile.job_title,
          connection_company: targetProfile.company,
          connection_phone: targetProfile.phone,
        });

      if (error) throw error;

      // Refresh connections list
      await loadExistingConnections();

      toast({
        title: "Connected!",
        description: `You're now connected with ${targetProfile.full_name}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingRequest(null);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name || !manualForm.email) {
      toast({
        title: "Required fields",
        description: "Name and email are required",
        variant: "destructive",
      });
      return;
    }

    setSavingManual(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if this email already has a Buizly account
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", manualForm.email)
        .maybeSingle();

      const connectionData = existingProfile ? {
        user_id: user.id,
        connection_name: existingProfile.full_name,
        connection_email: existingProfile.email,
        connection_title: existingProfile.job_title || manualForm.title,
        connection_company: existingProfile.company || manualForm.company,
        connection_phone: existingProfile.phone || manualForm.phone,
        notes: manualForm.notes,
      } : {
        user_id: user.id,
        connection_name: manualForm.name,
        connection_email: manualForm.email,
        connection_title: manualForm.title || null,
        connection_company: manualForm.company || null,
        connection_phone: manualForm.phone || null,
        notes: manualForm.notes || null,
      };

      const { error } = await supabase
        .from("connections")
        .insert(connectionData);

      if (error) throw error;

      toast({
        title: existingProfile ? "Connected with Buizly user!" : "Contact added",
        description: existingProfile 
          ? `${existingProfile.full_name} has a Buizly account - connected!`
          : `${manualForm.name} has been added to your network`,
      });

      // Reset form
      setManualForm({ name: "", email: "", phone: "", title: "", company: "", notes: "" });
      navigate("/network");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingManual(false);
    }
  };

  const getConnectionStatus = (profileId: string, email: string) => {
    const isConnected = connections.some(c => c.connection_email === email);
    if (isConnected) return "connected";
    return "not_connected";
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Add People</h1>
          <p className="text-muted-foreground text-sm">Find and connect with professionals</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "search" | "manual")}>
          <TabsList className="grid w-full grid-cols-2 bg-secondary">
            <TabsTrigger 
              value="search" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Search className="h-4 w-4 mr-2" />
              Find Users
            </TabsTrigger>
            <TabsTrigger 
              value="manual"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Manually
            </TabsTrigger>
          </TabsList>

          {/* Search Users Tab */}
          <TabsContent value="search" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or company..."
                className="pl-10 bg-secondary border-border text-foreground py-6"
              />
            </div>

            {/* Search Results */}
            <div className="space-y-3">
              {searching ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="bg-card border-border p-4">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-14 h-14 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-36" />
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-10 w-24 rounded-md" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : searchQuery.length < 2 ? (
                <Card className="bg-card border-border p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-foreground font-medium mb-1">Search for Buizly users</p>
                  <p className="text-muted-foreground text-sm">
                    Enter at least 2 characters to search
                  </p>
                </Card>
              ) : searchResults.length === 0 ? (
                <Card className="bg-card border-border p-8 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-foreground font-medium mb-1">No users found</p>
                  <p className="text-muted-foreground text-sm mb-4">
                    Try a different search term or add them manually
                  </p>
                  <Button
                    onClick={() => setActiveTab("manual")}
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    Add Manually
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Card>
              ) : (
                searchResults.map((profile) => {
                  const status = getConnectionStatus(profile.id, profile.email);
                  const isRequesting = sendingRequest === profile.id;

                  return (
                    <Card 
                      key={profile.id} 
                      className="bg-card border-border p-4 hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 cursor-pointer"
                          onClick={() => navigate(`/u/${profile.id}`)}
                        >
                          {profile.avatar_url ? (
                            <img 
                              src={profile.avatar_url} 
                              alt={profile.full_name}
                              className="w-14 h-14 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-primary text-xl font-bold">
                              {profile.full_name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigate(`/u/${profile.id}`)}
                        >
                          <p className="font-semibold text-foreground truncate">
                            {profile.full_name}
                          </p>
                          {profile.job_title && (
                            <p className="text-sm text-primary truncate">{profile.job_title}</p>
                          )}
                          {profile.company && (
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {profile.company}
                            </p>
                          )}
                        </div>
                        
                        {status === "connected" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="border-green-500 text-green-500"
                          >
                            Connected
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleSendConnectionRequest(profile)}
                            disabled={isRequesting}
                            size="sm"
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            {isRequesting ? "..." : "Connect"}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Manual Add Tab */}
          <TabsContent value="manual" className="space-y-6 mt-4">
            <form onSubmit={handleManualAdd} className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <label className="text-sm text-foreground mb-1.5 block">Name *</label>
                  <Input
                    value={manualForm.name}
                    onChange={(e) => setManualForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="John Doe"
                    className="bg-secondary border-border text-foreground"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm text-foreground mb-1.5 block">Email *</label>
                  <Input
                    type="email"
                    value={manualForm.email}
                    onChange={(e) => setManualForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="john@example.com"
                    className="bg-secondary border-border text-foreground"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    If they have a Buizly account, we'll automatically link it
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-foreground mb-1.5 block">Phone</label>
                    <Input
                      type="tel"
                      value={manualForm.phone}
                      onChange={(e) => setManualForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                      className="bg-secondary border-border text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-foreground mb-1.5 block">Title</label>
                    <Input
                      value={manualForm.title}
                      onChange={(e) => setManualForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Product Manager"
                      className="bg-secondary border-border text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-foreground mb-1.5 block">Company</label>
                  <Input
                    value={manualForm.company}
                    onChange={(e) => setManualForm(f => ({ ...f, company: e.target.value }))}
                    placeholder="Acme Inc."
                    className="bg-secondary border-border text-foreground"
                  />
                </div>

                <div>
                  <label className="text-sm text-foreground mb-1.5 block">Notes</label>
                  <Input
                    value={manualForm.notes}
                    onChange={(e) => setManualForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="How you met, context..."
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={savingManual}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6"
              >
                {savingManual ? "Adding..." : "Add Connection"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
