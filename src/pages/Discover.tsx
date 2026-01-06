import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Users, Building, ArrowRight, Check, X, Clock, UserCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useConnectionRequests } from "@/hooks/useConnectionRequests";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface ProfileWithVisibility extends Profile {
  isPrivate?: boolean;
}

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileWithVisibility[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "requests" | "manual">("search");
  const [initialLoading, setInitialLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { 
    incomingRequests, 
    outgoingRequests, 
    loading: requestsLoading,
    sendRequest,
    acceptRequest,
    declineRequest,
    getRequestStatus
  } = useConnectionRequests();

  // Manual add form
  const [manualForm, setManualForm] = useState({
    name: "", email: "", phone: "", title: "", company: "", notes: ""
  });
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    // Initial load complete
    setInitialLoading(false);
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

  const searchProfiles = async () => {
    setSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const query = searchQuery.toLowerCase();
      
      // Search profiles - always show results regardless of privacy
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, job_title, company, email")
        .neq("id", user.id)
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;

      // Get visibility settings for these profiles
      if (profiles && profiles.length > 0) {
        const { data: settings } = await supabase
          .from("user_settings")
          .select("user_id, profile_visibility")
          .in("user_id", profiles.map(p => p.id));

        const visibilityMap = new Map(settings?.map(s => [s.user_id, s.profile_visibility]) || []);
        
        const resultsWithVisibility = profiles.map(p => ({
          ...p,
          isPrivate: visibilityMap.get(p.id) === 'private',
          // Hide job_title and company for private profiles in search
          job_title: visibilityMap.get(p.id) === 'private' ? null : p.job_title,
          company: visibilityMap.get(p.id) === 'private' ? null : p.company,
        })) as ProfileWithVisibility[];

        setSearchResults(resultsWithVisibility);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (targetProfile: ProfileWithVisibility) => {
    const result = await sendRequest(targetProfile.id);
    if (result.success) {
      // Refresh search to update button states
      searchProfiles();
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

      const { error } = await supabase.from("connections").insert(connectionData);
      if (error) throw error;

      toast({
        title: existingProfile ? "Connected with Buizly user!" : "Contact added",
        description: existingProfile 
          ? `${existingProfile.full_name} has a Buizly account - connected!`
          : `${manualForm.name} has been added to your network`,
      });

      setManualForm({ name: "", email: "", phone: "", title: "", company: "", notes: "" });
      navigate("/network");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSavingManual(false);
    }
  };

  const getButtonState = (profile: ProfileWithVisibility) => {
    const status = getRequestStatus(profile.id);
    return status;
  };

  // Show requests tab badge
  const requestCount = incomingRequests.length;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Add People</h1>
          <p className="text-muted-foreground text-sm">Find and connect with professionals</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3 bg-secondary">
            <TabsTrigger 
              value="search" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Search className="h-4 w-4 mr-2" />
              Find
            </TabsTrigger>
            <TabsTrigger 
              value="requests"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Requests
              {requestCount > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 min-w-[18px] h-[18px]">
                  {requestCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="manual"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Manual
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
                  <p className="text-muted-foreground text-sm">Enter at least 2 characters</p>
                </Card>
              ) : searchResults.length === 0 ? (
                <Card className="bg-card border-border p-8 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-foreground font-medium mb-1">No users found</p>
                  <p className="text-muted-foreground text-sm mb-4">Try a different search or add manually</p>
                  <Button onClick={() => setActiveTab("manual")} variant="outline" className="border-primary text-primary">
                    Add Manually <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Card>
              ) : (
                searchResults.map((profile) => {
                  const status = getButtonState(profile);

                  return (
                    <Card 
                      key={profile.id} 
                      className="bg-card border-border p-4 hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        {/* Profile Card - Photo, Name, Company */}
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
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground truncate">
                              {profile.full_name}
                            </p>
                            {profile.isPrivate && (
                              <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">
                                Private
                              </Badge>
                            )}
                          </div>
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
                        
                        {/* Connection Button */}
                        {status === 'accepted' ? (
                          <Button variant="outline" size="sm" disabled className="border-green-500/50 text-green-500">
                            <Check className="h-4 w-4 mr-1" />
                            Connected
                          </Button>
                        ) : status === 'pending' ? (
                          <Button variant="outline" size="sm" disabled className="border-yellow-500/50 text-yellow-500">
                            <Clock className="h-4 w-4 mr-1" />
                            Pending
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleSendRequest(profile)}
                            size="sm"
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Connection Requests Tab */}
          <TabsContent value="requests" className="space-y-6 mt-4">
            {/* Incoming Requests */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Incoming Requests ({incomingRequests.length})
              </h3>
              {requestsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Card key={i} className="bg-card border-border p-4">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-9 w-20" />
                        <Skeleton className="h-9 w-20" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : incomingRequests.length === 0 ? (
                <Card className="bg-card border-border p-6 text-center">
                  <p className="text-muted-foreground">No pending requests</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {incomingRequests.map((request) => (
                    <Card key={request.id} className="bg-card border-border p-4">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center cursor-pointer"
                          onClick={() => navigate(`/u/${request.requester_id}`)}
                        >
                          {request.requester_profile?.avatar_url ? (
                            <img 
                              src={request.requester_profile.avatar_url} 
                              alt={request.requester_profile.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-primary font-bold">
                              {request.requester_profile?.full_name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {request.requester_profile?.full_name || 'Unknown'}
                          </p>
                          {request.requester_profile?.company && (
                            <p className="text-sm text-muted-foreground truncate">
                              {request.requester_profile.company}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => acceptRequest(request.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => declineRequest(request.id)}
                            size="sm"
                            variant="outline"
                            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Requests */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Sent Requests ({outgoingRequests.filter(r => r.status === 'pending').length})
              </h3>
              {outgoingRequests.filter(r => r.status === 'pending').length === 0 ? (
                <Card className="bg-card border-border p-6 text-center">
                  <p className="text-muted-foreground">No pending sent requests</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {outgoingRequests.filter(r => r.status === 'pending').map((request) => (
                    <Card key={request.id} className="bg-card border-border p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          {request.target_profile?.avatar_url ? (
                            <img 
                              src={request.target_profile.avatar_url} 
                              alt={request.target_profile.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-primary font-bold">
                              {request.target_profile?.full_name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {request.target_profile?.full_name || 'Unknown'}
                          </p>
                          {request.target_profile?.company && (
                            <p className="text-sm text-muted-foreground truncate">
                              {request.target_profile.company}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
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
                disabled={savingManual || !manualForm.name || !manualForm.email}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6"
              >
                {savingManual ? "Adding..." : "Add Contact"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
