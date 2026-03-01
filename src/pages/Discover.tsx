import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Users, Building, ArrowRight, Check, X, Clock, Lock, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useConnectionRequests } from "@/hooks/useConnectionRequests";
import { useProfileSearch, type SearchableProfile } from "@/hooks/useProfileSearch";
import { useAppCache } from "@/hooks/useAppCache";

export default function Discover() {
  const { isAuthenticated, initialized } = useAppCache();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (initialized && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [initialized, isAuthenticated, navigate]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"search" | "manual">("search");
  const { toast } = useToast();
  
  const { 
    sendRequest,
    getRequestStatus
  } = useConnectionRequests();

  const {
    results: searchResults,
    loading: searching,
    search,
    clearResults,
  } = useProfileSearch();

  const [manualForm, setManualForm] = useState({
    name: "", email: "", phone: "", title: "", company: "", notes: ""
  });
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length >= 1) {
      search(searchQuery);
    } else {
      clearResults();
    }
  }, [searchQuery, search, clearResults]);

  const handleSendRequest = async (targetProfile: SearchableProfile) => {
    const result = await sendRequest(targetProfile.id);
    if (result.success) {
      toast({
        title: "Request sent!",
        description: `Waiting for ${targetProfile.full_name} to accept`,
      });
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

  const getButtonState = (profileId: string) => {
    return getRequestStatus(profileId);
  };


  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Add People</h1>
            <p className="text-muted-foreground text-sm">Find and connect with professionals</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2 bg-secondary">
            <TabsTrigger 
              value="search" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Search className="h-4 w-4 mr-2" />
              Find
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
                placeholder="Type a name or email to search..."
                className="pl-10 bg-secondary border-border text-foreground py-6"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    clearResults();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="space-y-2">
              {searching ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="bg-card border-border p-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-9 w-20 rounded-md" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : searchQuery.length === 0 ? (
                <Card className="bg-card border-border p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-foreground font-medium mb-1">Search for Buizly users</p>
                  <p className="text-muted-foreground text-sm">Start typing a name or email</p>
                </Card>
              ) : searchResults.length === 0 && searchQuery.length >= 1 ? (
                <Card className="bg-card border-border p-6 text-center">
                  <Search className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-foreground font-medium mb-1">No users found for "{searchQuery}"</p>
                  <p className="text-muted-foreground text-sm mb-4">Try a different search or add manually</p>
                  <Button onClick={() => setActiveTab("manual")} variant="outline" className="border-primary text-primary">
                    Add Manually <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Card>
              ) : (
                <>
                  {searchResults.length > 0 && (
                    <p className="text-xs text-muted-foreground px-1">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                    </p>
                  )}
                  {searchResults.map((profile) => {
                    const status = getButtonState(profile.id);

                    return (
                      <Card 
                        key={profile.id} 
                        className="bg-card border-border p-3 hover:border-primary/50 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 cursor-pointer overflow-hidden"
                            onClick={() => navigate(`/u/${profile.id}`)}
                          >
                            {profile.avatar_url ? (
                              <img 
                                src={profile.avatar_url} 
                                alt={profile.full_name}
                                className="w-12 h-12 rounded-full object-cover"
                                loading="eager"
                                decoding="async"
                                fetchPriority="high"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <span className={`text-primary text-lg font-bold ${profile.avatar_url ? 'hidden' : ''}`}>
                              {profile.full_name.charAt(0).toUpperCase()}
                            </span>
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
                                <Lock className="h-3 w-3 text-muted-foreground" />
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
                            {profile.isPrivate && !profile.job_title && !profile.company && (
                              <p className="text-xs text-muted-foreground italic">Private profile</p>
                            )}
                          </div>
                          
                          {profile.isPrivate ? (
                            <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground whitespace-nowrap">
                              Private
                            </Badge>
                          ) : status === 'accepted' ? (
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendRequest(profile);
                              }}
                              size="sm"
                              className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              Connect
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </>
              )}
            </div>
          </TabsContent>

          {/* Manual Add Tab */}
          <TabsContent value="manual" className="mt-4">
            <Card className="bg-card border-border p-6">
              <form onSubmit={handleManualAdd} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Name *</label>
                  <Input
                    value={manualForm.name}
                    onChange={(e) => setManualForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Full name"
                    className="bg-secondary border-border"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Email *</label>
                  <Input
                    type="email"
                    value={manualForm.email}
                    onChange={(e) => setManualForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="bg-secondary border-border"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Phone</label>
                  <Input
                    value={manualForm.phone}
                    onChange={(e) => setManualForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Job Title</label>
                    <Input
                      value={manualForm.title}
                      onChange={(e) => setManualForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Manager"
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Company</label>
                    <Input
                      value={manualForm.company}
                      onChange={(e) => setManualForm(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="e.g. Acme Inc"
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Notes</label>
                  <Input
                    value={manualForm.notes}
                    onChange={(e) => setManualForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="How did you meet?"
                    className="bg-secondary border-border"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-primary text-primary-foreground"
                  disabled={!manualForm.name || !manualForm.email || savingManual}
                >
                  {savingManual ? "Adding..." : "Add Contact"}
                </Button>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
